export const PEN_COLOURS: { colour: string; code: string }[] = [
    {
        colour: "Chalk",
        code: "#e6e8e6",
    },
    {
        colour: "Amber",
        code: "#ffcb00",
    },
    {
        colour: "Coral",
        code: "#ff5744",
    },
    {
        colour: "Magenta",
        code: "#ff12f7",
    },
    {
        colour: "Violet",
        code: "#6c8aff",
    },
    {
        colour: "Cyan",
        code: "#00e3fe",
    },
    {
        colour: "Green",
        code: "#00fe78",
    },
    {
        colour: "Black",
        code: "#000000",
    },
];

// Drawn into the <canvas>, which CSS variables don't reach, so these are
// literal mirrors of --foreground-second.
export const SELECTION_COLOURS = {
    border: "rgba(205, 203, 203, 0.55)",
} as const;

export const HIGHLIGHT_COLOURS: { colour: string; code: string }[] = [
    {
        colour: "Butter",
        code: "#f0dda9",
    },
    {
        colour: "Peach",
        code: "#ffd2ca",
    },
    {
        colour: "Rose",
        code: "#facef4",
    },
    {
        colour: "Lilac",
        code: "#d1ddff",
    },
    {
        colour: "Mint",
        code: "#b3edd3",
    },
];
