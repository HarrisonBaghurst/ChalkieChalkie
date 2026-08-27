// crypto.randomUUID is secure-context-only, so it is absent when the dev server
// is reached over a plain-HTTP LAN address — which is exactly how the board gets
// tested from an iPad. getRandomValues carries no such gate.
export const newId = (): string => {
    if (typeof crypto !== "undefined") {
        if (typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }

        if (typeof crypto.getRandomValues === "function") {
            const bytes = crypto.getRandomValues(new Uint8Array(16));
            bytes[6] = (bytes[6] & 0x0f) | 0x40;
            bytes[8] = (bytes[8] & 0x3f) | 0x80;

            const hex = Array.from(bytes, (b) =>
                b.toString(16).padStart(2, "0"),
            ).join("");

            return [
                hex.slice(0, 8),
                hex.slice(8, 12),
                hex.slice(12, 16),
                hex.slice(16, 20),
                hex.slice(20),
            ].join("-");
        }
    }

    return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 14)}`;
};
