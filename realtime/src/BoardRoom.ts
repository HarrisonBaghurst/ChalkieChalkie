import type { PastedImageMeta } from "@/types/imageTypes";
import type { Stroke } from "@/types/strokeTypes";
import { REALTIME_SUBPROTOCOL } from "@/types/realtimeTypes";
import type {
    ClientMessage,
    Op,
    PeerState,
    Presence,
    ServerMessage,
    UserInfo,
} from "@/types/realtimeTypes";

const INIT_CHUNK_BYTES = 256 * 1024;
const TOMBSTONE_CAP = 2000;

const OP_BURST = 120;
const OP_REFILL_PER_SECOND = 60;
const PRESENCE_BURST = 60;
const PRESENCE_REFILL_PER_SECOND = 30;

type Attachment = {
    connectionId: number;
    userId: string;
    info: UserInfo;
};

type Bucket = { tokens: number; last: number };

type Connection = {
    presence: Presence;
    ops: Bucket;
    presenceFrames: Bucket;
};

const emptyPresence = (): Presence => ({ cursor: null, selection: null });

const spend = (bucket: Bucket, burst: number, refill: number): boolean => {
    const now = Date.now();
    bucket.tokens = Math.min(
        burst,
        bucket.tokens + ((now - bucket.last) / 1000) * refill,
    );
    bucket.last = now;
    if (bucket.tokens < 1) return false;
    bucket.tokens -= 1;
    return true;
};

export class BoardRoom implements DurableObject {
    private ctx: DurableObjectState;
    private nextSeq = 0;
    private nextConnectionId = 1;
    private connections = new Map<WebSocket, Connection>();
    // Set when the constructor finds live sockets but no presence, which only
    // happens on a wake from hibernation.
    private needsPresenceResync = false;

    constructor(ctx: DurableObjectState) {
        this.ctx = ctx;

        this.ctx.blockConcurrencyWhile(async () => {
            this.migrate();
            this.nextSeq = this.readMaxSeq() + 1;

            const sockets = this.ctx.getWebSockets();
            for (const socket of sockets) {
                const attachment =
                    socket.deserializeAttachment() as Attachment | null;
                if (!attachment) continue;
                this.connections.set(socket, this.newConnection());
                this.nextConnectionId = Math.max(
                    this.nextConnectionId,
                    attachment.connectionId + 1,
                );
            }
            if (sockets.length > 0) this.needsPresenceResync = true;
        });

        this.ctx.setWebSocketAutoResponse(
            new WebSocketRequestResponsePair("ping", "pong"),
        );
    }

    private newConnection(): Connection {
        const now = Date.now();
        return {
            presence: emptyPresence(),
            ops: { tokens: OP_BURST, last: now },
            presenceFrames: { tokens: PRESENCE_BURST, last: now },
        };
    }

    private get sql() {
        return this.ctx.storage.sql;
    }

    // WITHOUT ROWID and no secondary index, because rows written is the first
    // billing limit to bind and both cost a write on every single stroke.
    // Measured: a plain `id TEXT PRIMARY KEY` table costs 2 rows per insert (the
    // row plus SQLite's automatic PK index) and 3 with an index on (deleted, seq).
    // WITHOUT ROWID makes the key the table itself, so it is 1. The index only
    // ever paid off on the init read, and reads have 50x the free allowance.
    private migrate() {
        for (const table of ["strokes", "images"]) {
            if (this.isLegacySchema(table)) {
                this.sql.exec(`DROP TABLE IF EXISTS ${table}`);
            }
            this.sql.exec(
                `CREATE TABLE IF NOT EXISTS ${table} (
                    id TEXT PRIMARY KEY,
                    seq INTEGER NOT NULL,
                    body TEXT NOT NULL,
                    deleted INTEGER NOT NULL DEFAULT 0
                ) WITHOUT ROWID`,
            );
        }
    }

    // PRAGMA user_version is not authorised in Durable Object SQLite, so the
    // stored DDL is the version marker. Rooms created before this drop their
    // contents on next open — acceptable while there is no real board data, and
    // the alternative is carrying a 3x write cost forever.
    private isLegacySchema(table: string): boolean {
        const rows = this.sql
            .exec<{
                sql: string | null;
            }>(
                `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`,
                table,
            )
            .toArray();
        if (rows.length === 0) return false;
        return !(rows[0].sql ?? "").toUpperCase().includes("WITHOUT ROWID");
    }

    // No persisted counter: a meta write per insert would roughly double rows
    // written, which is the first billing limit to bind.
    private readMaxSeq(): number {
        const rows = this.sql
            .exec<{ value: number | null }>(
                `SELECT MAX(value) AS value FROM (
                    SELECT MAX(seq) AS value FROM strokes
                    UNION ALL
                    SELECT MAX(seq) AS value FROM images
                )`,
            )
            .toArray();
        return rows[0]?.value ?? 0;
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);

        if (request.method === "DELETE") {
            for (const socket of this.ctx.getWebSockets()) {
                socket.close(1001, "Room deleted");
            }
            this.connections.clear();
            await this.ctx.storage.deleteAll();
            // deleteAll drops the tables, and migrate only runs in the
            // constructor. Without this, the next connection to a deleted room
            // 500s on "no such table" instead of getting a fresh board.
            this.migrate();
            this.nextSeq = 1;
            return new Response(null, { status: 204 });
        }

        if (url.pathname.endsWith("/evict")) {
            const userId = url.searchParams.get("userId");
            let closed = 0;
            for (const socket of this.ctx.getWebSockets()) {
                const attachment =
                    socket.deserializeAttachment() as Attachment | null;
                if (attachment?.userId !== userId) continue;
                socket.close(1008, "Access revoked");
                this.connections.delete(socket);
                closed++;
            }
            return Response.json({ closed });
        }

        const userId = request.headers.get("x-chalkie-user");
        const rawInfo = request.headers.get("x-chalkie-info");
        if (!userId || !rawInfo) {
            return new Response("Missing identity", { status: 400 });
        }

        let info: UserInfo;
        try {
            info = JSON.parse(rawInfo);
        } catch {
            return new Response("Bad identity", { status: 400 });
        }

        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);

        const connectionId = this.nextConnectionId++;
        const attachment: Attachment = { connectionId, userId, info };

        // acceptWebSocket, not server.accept(): hibernation is what keeps an
        // idle room off the duration meter.
        this.ctx.acceptWebSocket(server);
        server.serializeAttachment(attachment);
        this.connections.set(server, this.newConnection());

        this.sendInit(server, attachment);
        this.broadcast(
            {
                t: "join",
                peer: {
                    connectionId,
                    userId,
                    info,
                    presence: emptyPresence(),
                },
            },
            server,
        );

        // Chrome fails the handshake unless the chosen subprotocol is echoed.
        return new Response(null, {
            status: 101,
            webSocket: client,
            headers: { "Sec-WebSocket-Protocol": REALTIME_SUBPROTOCOL },
        });
    }

    private sendInit(socket: WebSocket, self: Attachment) {
        this.vacuumIfIdle();

        this.send(socket, {
            t: "init-begin",
            connectionId: self.connectionId,
            userId: self.userId,
            info: self.info,
        });

        // Chunked on serialised bytes, not row count: a websocket frame caps at
        // 1 MB and stroke point arrays vary by orders of magnitude.
        let strokes: Stroke[] = [];
        let images: PastedImageMeta[] = [];
        let bytes = 0;

        const flush = () => {
            if (strokes.length === 0 && images.length === 0) return;
            this.send(socket, { t: "init-chunk", strokes, images });
            strokes = [];
            images = [];
            bytes = 0;
        };

        for (const row of this.sql.exec<{ body: string }>(
            `SELECT body FROM strokes WHERE deleted = 0 ORDER BY seq`,
        )) {
            strokes.push(JSON.parse(row.body));
            bytes += row.body.length;
            if (bytes >= INIT_CHUNK_BYTES) flush();
        }

        for (const row of this.sql.exec<{ body: string }>(
            `SELECT body FROM images WHERE deleted = 0 ORDER BY seq`,
        )) {
            images.push(JSON.parse(row.body));
            bytes += row.body.length;
            if (bytes >= INIT_CHUNK_BYTES) flush();
        }

        flush();

        const others: PeerState[] = [];
        for (const [peer, connection] of this.connections) {
            if (peer === socket) continue;
            const peerAttachment =
                peer.deserializeAttachment() as Attachment | null;
            if (!peerAttachment) continue;
            others.push({
                connectionId: peerAttachment.connectionId,
                userId: peerAttachment.userId,
                info: peerAttachment.info,
                presence: connection.presence,
            });
        }

        this.send(socket, { t: "init-end", others });
    }

    // Only safe with no other connection open: nobody can be holding an undo
    // stack that still refers to these rows.
    private vacuumIfIdle() {
        if (this.connections.size > 1) return;
        for (const table of ["strokes", "images"]) {
            this.sql.exec(`DELETE FROM ${table} WHERE deleted = 1`);
        }
    }

    private capTombstones(table: "strokes" | "images") {
        const rows = this.sql
            .exec<{ count: number }>(
                `SELECT COUNT(*) AS count FROM ${table} WHERE deleted = 1`,
            )
            .toArray();
        if ((rows[0]?.count ?? 0) <= TOMBSTONE_CAP) return;
        this.sql.exec(
            `DELETE FROM ${table} WHERE deleted = 1 AND seq NOT IN (
                SELECT seq FROM ${table} WHERE deleted = 1 ORDER BY seq DESC LIMIT ?
            )`,
            Math.floor(TOMBSTONE_CAP / 4),
        );
    }

    webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer) {
        if (this.needsPresenceResync) {
            this.needsPresenceResync = false;
            this.broadcast({ t: "resync-presence" });
        }

        const connection = this.connections.get(socket);
        if (!connection) return;
        if (typeof raw !== "string") return;

        let message: ClientMessage;
        try {
            message = JSON.parse(raw);
        } catch {
            return;
        }

        const attachment = socket.deserializeAttachment() as Attachment | null;
        if (!attachment) return;

        if (message.t === "presence") {
            if (
                !spend(
                    connection.presenceFrames,
                    PRESENCE_BURST,
                    PRESENCE_REFILL_PER_SECOND,
                )
            ) {
                return;
            }
            connection.presence = {
                ...connection.presence,
                ...message.patch,
            };
            this.broadcast(
                {
                    t: "presence",
                    from: attachment.connectionId,
                    patch: message.patch,
                },
                socket,
            );
            return;
        }

        if (message.t === "op") {
            if (!spend(connection.ops, OP_BURST, OP_REFILL_PER_SECOND)) {
                socket.close(1008, "Too many operations");
                this.connections.delete(socket);
                return;
            }
            this.applyOp(message.op);
            // Echoed to the sender too: the DO is the sequencer, and the
            // client's reducer is idempotent so a self-echo costs nothing.
            this.broadcast({
                t: "op",
                op: message.op,
                from: attachment.connectionId,
            });
        }
    }

    webSocketClose(socket: WebSocket) {
        this.dropSocket(socket);
    }

    webSocketError(socket: WebSocket) {
        this.dropSocket(socket);
    }

    private dropSocket(socket: WebSocket) {
        const attachment = socket.deserializeAttachment() as Attachment | null;
        this.connections.delete(socket);
        if (attachment) {
            this.broadcast({
                t: "leave",
                connectionId: attachment.connectionId,
            });
        }
    }

    private applyOp(op: Op) {
        this.ctx.storage.transactionSync(() => {
            switch (op.t) {
                case "addStroke":
                    this.insert("strokes", op.stroke.id, op.stroke);
                    break;

                case "eraseStrokes":
                    this.softDelete("strokes", op.ids);
                    break;

                case "restoreStrokes":
                    for (const stroke of op.strokes) {
                        this.restore("strokes", stroke.id, stroke);
                    }
                    break;

                case "addImage":
                    this.insert("images", op.meta.id, op.meta);
                    break;

                case "removeImage":
                    this.softDelete("images", [op.id]);
                    break;

                case "updateImage":
                    this.merge("images", op.id, op.changes);
                    break;

                case "moveStrokes":
                    for (const move of op.moves) {
                        this.merge("strokes", move.id, { points: move.points });
                    }
                    break;
            }
        });
    }

    private insert(table: "strokes" | "images", id: string, body: unknown) {
        this.sql.exec(
            `INSERT INTO ${table} (id, seq, body, deleted) VALUES (?, ?, ?, 0)
             ON CONFLICT(id) DO UPDATE SET body = excluded.body, deleted = 0`,
            id,
            this.nextSeq++,
            JSON.stringify(body),
        );
    }

    private softDelete(table: "strokes" | "images", ids: string[]) {
        if (ids.length === 0) return;
        const placeholders = ids.map(() => "?").join(",");
        this.sql.exec(
            `UPDATE ${table} SET deleted = 1 WHERE id IN (${placeholders})`,
            ...ids,
        );
        this.capTombstones(table);
    }

    // Clears the tombstone rather than reinserting, so an undone erase comes
    // back at its original seq and therefore its original paint layer.
    private restore(table: "strokes" | "images", id: string, body: unknown) {
        const changed = this.sql.exec(
            `UPDATE ${table} SET deleted = 0, body = ? WHERE id = ?`,
            JSON.stringify(body),
            id,
        ).rowsWritten;
        if (changed === 0) this.insert(table, id, body);
    }

    private merge(
        table: "strokes" | "images",
        id: string,
        changes: Record<string, unknown>,
    ) {
        const rows = this.sql
            .exec<{
                body: string;
            }>(`SELECT body FROM ${table} WHERE id = ? AND deleted = 0`, id)
            .toArray();
        if (rows.length === 0) return;

        // seq is deliberately untouched: LiveList.set preserved list position,
        // and paint order is list order.
        const merged = { ...JSON.parse(rows[0].body), ...changes };
        this.sql.exec(
            `UPDATE ${table} SET body = ? WHERE id = ?`,
            JSON.stringify(merged),
            id,
        );
    }

    private send(socket: WebSocket, message: ServerMessage) {
        try {
            socket.send(JSON.stringify(message));
        } catch {
            this.connections.delete(socket);
        }
    }

    private broadcast(message: ServerMessage, except?: WebSocket) {
        const payload = JSON.stringify(message);
        for (const socket of this.ctx.getWebSockets()) {
            if (socket === except) continue;
            try {
                socket.send(payload);
            } catch {
                this.connections.delete(socket);
            }
        }
    }
}
