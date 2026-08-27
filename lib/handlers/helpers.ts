import { Point } from "@/types/strokeTypes";
import { CanvasState } from "@/types/canvasStateTypes";

type ClientPoint = { clientX: number; clientY: number };

// Off the cached rect, not getBoundingClientRect: coalesced pointer samples
// carry no currentTarget, and a layout read per sample is dear at a Pencil's
// 240 Hz.
export const toCanvasPoint = (e: ClientPoint, state: CanvasState): Point => ({
    x: e.clientX - state.canvasRect.left,
    y: e.clientY - state.canvasRect.top,
});

// screen → world: (screen - panOffset) / zoom
export const toWorldPoint = (e: ClientPoint, state: CanvasState): Point => {
    const { x, y } = toCanvasPoint(e, state);
    const { offset, zoom } = state.viewport;
    return { x: (x - offset.x) / zoom, y: (y - offset.y) / zoom };
};

export const screenToWorld = (point: Point, state: CanvasState): Point => {
    const { offset, zoom } = state.viewport;
    return { x: (point.x - offset.x) / zoom, y: (point.y - offset.y) / zoom };
};
