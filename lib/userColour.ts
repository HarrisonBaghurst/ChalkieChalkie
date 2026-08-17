// Deterministic, so a person keeps one colour across cursor and roster in every
// session. Exported so the style guide can render the real palette.
export const USER_COLOUR_PALETTE = [
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

export function getUserColour(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash * 31 + id.charCodeAt(i)) | 0;
    }
    const index = Math.abs(hash) % USER_COLOUR_PALETTE.length;
    return USER_COLOUR_PALETTE[index];
}
