// Deterministic per-user colour: the same Clerk userId always maps to the same
// hue, so a person keeps one colour across their cursor and the participant
// roster, every session. Palette is tuned to read on the dark #0d0d0a theme.

const PALETTE = [
    "#eb7a38", // orange
    "#38bdf8", // sky
    "#a78bfa", // violet
    "#34d399", // emerald
    "#f472b6", // pink
    "#facc15", // amber
    "#60a5fa", // blue
    "#fb7185", // rose
    "#4ade80", // green
    "#c084fc", // purple
];

/**
 * Map a stable string id (Clerk userId) to a fixed palette colour.
 */
export function getUserColour(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash * 31 + id.charCodeAt(i)) | 0;
    }
    const index = Math.abs(hash) % PALETTE.length;
    return PALETTE[index];
}
