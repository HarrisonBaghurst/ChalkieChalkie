export type Tools = "pen" | "eraser" | "pointer" | "selector";

export const toolCursorMap: Record<Tools, string> = {
    pen: "crosshair",
    eraser: "crosshair",
    pointer: "default",
    selector: "crosshair",
};
