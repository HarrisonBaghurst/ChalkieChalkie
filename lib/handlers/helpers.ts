import { Point } from "@/types/strokeTypes";
import { Viewport } from "@/types/canvasStateTypes";

export const getMousePos = (e: React.MouseEvent): Point => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};

// screen → world: (screen - panOffset) / zoom
export const getWorldPoint = (e: React.MouseEvent, viewport: Viewport): Point => {
    const { x, y } = getMousePos(e);
    return {
        x: (x - viewport.offset.x) / viewport.zoom,
        y: (y - viewport.offset.y) / viewport.zoom,
    };
};
