import { Tools } from "@/types/toolTypes";
import { ToolStrategy } from "@/types/canvasStateTypes";
import { penStrategy } from "./tools/pen";
import { eraserStrategy } from "./tools/eraser";
import { pointerStrategy } from "./tools/pointer";
import { highlighterStrategy } from "./tools/highlighter";

// Pan is deliberately absent: it is bound to the right mouse button whatever
// the active tool, and dispatched separately.
export const toolStrategies: Record<Tools, ToolStrategy> = {
    pen: penStrategy,
    eraser: eraserStrategy,
    pointer: pointerStrategy,
    highlighter: highlighterStrategy,
};
