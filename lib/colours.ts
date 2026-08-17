export const PEN_COLOURS: { colour: string; code: string }[] = [
    {
        colour: "White",
        code: "#e6e8e6",
    },
    {
        colour: "Yellow",
        code: "#dbc15a",
    },
    {
        colour: "Orange",
        code: "#f59542",
    },
    {
        colour: "Red",
        code: "#e36868",
    },
    {
        colour: "Pink",
        code: "#e66eaa",
    },
];

/**
 * Selection chrome for the pointer tool. Drawn into the <canvas>, where CSS
 * variables don't reach, so these are literal rgba mirrors of
 * `--foreground-second` (hsl(0, 2%, 80%) = rgb(205, 203, 203)) rather than
 * token references. All three are semitransparent so the board reads through
 * them — a selection marks what is picked up, it doesn't recolour it.
 */
export const SELECTION_COLOURS = {
    /** Outline of the drag marquee and of every selected image. */
    border: "rgba(205, 203, 203, 0.55)",
    /** Wash filling the marquee and each selected image. */
    fill: "rgba(205, 203, 203, 0.1)",
    /** Thicker wash traced over selected strokes, which have no area to fill. */
    stroke: "rgba(205, 203, 203, 0.28)",
} as const;

export const HIGHLIGHT_COLOURS: { colour: string; code: string }[] = [
    {
        colour: "Butter",
        code: "#f2d178",
    },
    {
        colour: "Peach",
        code: "#f0a56b",
    },
    {
        colour: "Rose",
        code: "#e88aa8",
    },
    {
        colour: "Mauve",
        code: "#c78fbf",
    },
];
