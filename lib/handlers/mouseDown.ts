import { RefObject } from "react";
import { Stroke } from "@/types/strokeTypes";
import { CanvasState, ToolCallbacks, ToolContext } from "@/types/canvasStateTypes";
import { toolStrategies } from "./toolStrategies";
import { panStrategy } from "./tools/pan";

interface HandleMouseDownProps {
    e: React.MouseEvent;
    canvasStateRef: RefObject<CanvasState>;
    strokes: readonly Stroke[] | null;
    callbacks: ToolCallbacks;
}

export const handleMouseDown = ({
    e,
    canvasStateRef,
    strokes,
    callbacks,
}: HandleMouseDownProps) => {
    e.preventDefault();

    const state = canvasStateRef.current;
    const ctx: ToolContext = { e, state, strokes, callbacks };

    // right button → pan, regardless of active tool
    if (e.buttons === 2) {
        panStrategy.onDown?.(ctx);
        return;
    }

    if (e.buttons === 1) {
        toolStrategies[state.tool].onDown?.(ctx);
    }
};
