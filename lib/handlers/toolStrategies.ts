import { Tools } from "@/types/toolTypes";
import { ToolStrategy } from "@/types/canvasStateTypes";
import { penStrategy } from "./tools/pen";
import { eraserStrategy } from "./tools/eraser";
import { pointerStrategy } from "./tools/pointer";
import { selectorStrategy } from "./tools/selector";
import { highlighterStrategy } from "./tools/highlighter";

// per-tool strategy registry — adding a tool means adding one entry here.
// pan is intentionally absent: it is bound to the right mouse button (button 2)
// regardless of the active tool, and dispatched separately.
export const toolStrategies: Record<Tools, ToolStrategy> = {
    pen: penStrategy,
    eraser: eraserStrategy,
    pointer: pointerStrategy,
    selector: selectorStrategy,
    highlighter: highlighterStrategy,
};
