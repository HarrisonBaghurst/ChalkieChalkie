import { RefObject } from "react";
import { Stroke } from "@/types/strokeTypes";
import { CanvasState, ToolCallbacks, ToolContext } from "@/types/canvasStateTypes";
import { toolStrategies } from "./toolStrategies";
import { panStrategy } from "./tools/pan";

interface HandleMouseMoveProps {
    e: React.MouseEvent;
    canvasStateRef: RefObject<CanvasState>;
    strokes: readonly Stroke[] | null;
    callbacks: ToolCallbacks;
}

export const handleMouseMove = (() => {
    let lastTime = 0;
    const THROTTLE_MS = 16; // ~60 FPS

    return ({ e, canvasStateRef, strokes, callbacks }: HandleMouseMoveProps) => {
        const now = performance.now();
        if (now - lastTime < THROTTLE_MS) return;
        lastTime = now;

        const state = canvasStateRef.current;
        const ctx: ToolContext = { e, state, strokes, callbacks };

        // right button → pan, regardless of active tool
        if (e.buttons === 2) {
            panStrategy.onMove?.(ctx);
            return;
        }

        if (e.buttons === 1) {
            toolStrategies[state.tool].onMove?.(ctx);
        }
    };
})();
