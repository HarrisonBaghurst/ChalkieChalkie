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

// Drawn into the <canvas>, which CSS variables don't reach, so these are
// literal mirrors of --foreground-second.
export const SELECTION_COLOURS = {
    border: "rgba(205, 203, 203, 0.55)",
    fill: "rgba(205, 203, 203, 0.1)",
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
