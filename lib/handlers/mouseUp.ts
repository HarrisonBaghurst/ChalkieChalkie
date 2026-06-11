import { RefObject } from "react";
import { Stroke } from "@/types/strokeTypes";
import { CanvasState, ToolCallbacks, ToolContext } from "@/types/canvasStateTypes";
import { toolStrategies } from "./toolStrategies";
import { panStrategy } from "./tools/pan";

interface HandleMouseUpProps {
    e: React.MouseEvent;
    canvasStateRef: RefObject<CanvasState>;
    strokes: readonly Stroke[] | null;
    callbacks: ToolCallbacks;
}

export const handleMouseUp = ({
    e,
    canvasStateRef,
    strokes,
    callbacks,
}: HandleMouseUpProps) => {
    const state = canvasStateRef.current;
    const ctx: ToolContext = { e, state, strokes, callbacks };

    if (e.button === 2) {
        panStrategy.onUp?.(ctx);
    } else if (e.button === 0) {
        toolStrategies[state.tool].onUp?.(ctx);
    }

    state.imageDragOffset = null;
    state.activeResizeHandle = null;
};
