import type { TicketClaims } from "@/types/realtimeTypes";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let cachedKey: Promise<CryptoKey> | null = null;

const verifyKey = (secret: string): Promise<CryptoKey> => {
    if (!cachedKey) {
        cachedKey = crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["verify"],
        );
    }
    return cachedKey;
};

const fromBase64url = (value: string): Uint8Array => {
    const padded = value
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
};

// Returns null for every failure mode. The caller turns that into one 401 with
// no detail, so a probe cannot tell a bad signature from an expired token.
export async function verifyTicket(
    token: string,
    room: string,
    secret: string,
): Promise<TicketClaims | null> {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;

    let valid: boolean;
    try {
        valid = await crypto.subtle.verify(
            "HMAC",
            await verifyKey(secret),
            fromBase64url(signature),
            encoder.encode(`${header}.${payload}`),
        );
    } catch {
        return null;
    }
    if (!valid) return null;

    let claims: TicketClaims;
    try {
        claims = JSON.parse(decoder.decode(fromBase64url(payload)));
    } catch {
        return null;
    }

    if (typeof claims.sub !== "string" || !claims.sub) return null;
    if (typeof claims.exp !== "number") return null;
    if (claims.exp * 1000 < Date.now()) return null;

    // A ticket authorises exactly the room it was minted for, so a member of one
    // room cannot replay their token into another.
    if (claims.room !== room) return null;

    return claims;
}
