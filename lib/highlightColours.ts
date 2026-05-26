export const HIGHLIGHT_COLOURS = [
    "#FFE600", // yellow
    "#00E5FF", // cyan
    "#FF69B4", // pink
    "#69FF47", // green
] as const;

export type HighlightColour = (typeof HIGHLIGHT_COLOURS)[number];
