import { TicketClaims, UserInfo } from "@/types/realtimeTypes";

export const TICKET_TTL_SECONDS = 60;

const encoder = new TextEncoder();

let cachedKey: Promise<CryptoKey> | null = null;

const signingKey = (): Promise<CryptoKey> => {
    if (!cachedKey) {
        cachedKey = crypto.subtle.importKey(
            "raw",
            encoder.encode(process.env.REALTIME_TICKET_SECRET!),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"],
        );
    }
    return cachedKey;
};

const base64url = (bytes: Uint8Array): string => {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
};

export async function signTicket(
    userId: string,
    room: string,
    info: UserInfo,
): Promise<string> {
    const issued = Math.floor(Date.now() / 1000);
    const claims: TicketClaims = {
        sub: userId,
        room,
        info,
        iat: issued,
        exp: issued + TICKET_TTL_SECONDS,
    };

    const header = base64url(encoder.encode('{"alg":"HS256","typ":"JWT"}'));
    const payload = base64url(encoder.encode(JSON.stringify(claims)));
    const signingInput = `${header}.${payload}`;

    const signature = new Uint8Array(
        await crypto.subtle.sign(
            "HMAC",
            await signingKey(),
            encoder.encode(signingInput),
        ),
    );

    return `${signingInput}.${base64url(signature)}`;
}
