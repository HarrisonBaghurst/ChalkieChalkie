import { REALTIME_SUBPROTOCOL } from "@/types/realtimeTypes";
import { BoardRoom } from "./BoardRoom";
import { verifyTicket } from "./ticket";

export { BoardRoom };

export interface Env {
    BOARD_ROOM: DurableObjectNamespace;
    REALTIME_TICKET_SECRET: string;
    REALTIME_ADMIN_SECRET: string;
}

const ROOM_SOCKET = /^\/room\/([A-Za-z0-9_-]{1,64})\/ws$/;
const ROOM_ADMIN = /^\/rooms\/([A-Za-z0-9_-]{1,64})$/;
const ROOM_EVICT = /^\/rooms\/([A-Za-z0-9_-]{1,64})\/evict$/;

const stub = (env: Env, roomId: string) =>
    env.BOARD_ROOM.get(env.BOARD_ROOM.idFromName(roomId));

const authorisedAdmin = (request: Request, env: Env) =>
    request.headers.get("Authorization") ===
    `Bearer ${env.REALTIME_ADMIN_SECRET}`;

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        const socketMatch = ROOM_SOCKET.exec(url.pathname);
        if (socketMatch) {
            if (request.headers.get("Upgrade") !== "websocket") {
                return new Response("Expected websocket", { status: 426 });
            }

            const roomId = socketMatch[1];

            // The ticket rides as a subprotocol rather than a query parameter so
            // it never reaches a URL or an access log.
            const offered = (
                request.headers.get("Sec-WebSocket-Protocol") ?? ""
            )
                .split(",")
                .map((value) => value.trim());

            if (offered[0] !== REALTIME_SUBPROTOCOL || !offered[1]) {
                return new Response("Unauthorised", { status: 401 });
            }

            const claims = await verifyTicket(
                offered[1],
                roomId,
                env.REALTIME_TICKET_SECRET,
            );
            if (!claims) return new Response("Unauthorised", { status: 401 });

            // Derived from the original request, never rebuilt: a fresh Request
            // drops Upgrade: websocket and the runtime then refuses to return a
            // socket at all.
            const headers = new Headers(request.headers);
            headers.delete("Sec-WebSocket-Protocol");
            headers.set("x-chalkie-user", claims.sub);
            headers.set("x-chalkie-info", JSON.stringify(claims.info));

            // Returned as-is. The DO sets the subprotocol header on its own 101,
            // because re-wrapping an upgrade response invalidates it.
            return stub(env, roomId).fetch(
                new Request(request, { headers }),
            );
        }

        const evictMatch = ROOM_EVICT.exec(url.pathname);
        if (evictMatch && request.method === "POST") {
            if (!authorisedAdmin(request, env)) {
                return new Response("Unauthorised", { status: 401 });
            }
            const userId = url.searchParams.get("userId");
            if (!userId) return new Response("Missing userId", { status: 400 });
            return stub(env, evictMatch[1]).fetch(
                new Request(
                    `https://do/evict?userId=${encodeURIComponent(userId)}`,
                ),
            );
        }

        const adminMatch = ROOM_ADMIN.exec(url.pathname);
        if (adminMatch && request.method === "DELETE") {
            if (!authorisedAdmin(request, env)) {
                return new Response("Unauthorised", { status: 401 });
            }
            return stub(env, adminMatch[1]).fetch(
                new Request("https://do/", { method: "DELETE" }),
            );
        }

        if (url.pathname === "/health") {
            return new Response("ok");
        }

        return new Response("Not found", { status: 404 });
    },
};
