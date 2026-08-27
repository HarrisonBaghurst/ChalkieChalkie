import { Point } from "@/types/strokeTypes";
import { Viewport } from "@/types/canvasStateTypes";

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4.0;
export const ZOOM_RATIO = 1.1;

export const clampZoom = (zoom: number): number =>
    Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));

// anchor is canvas-relative screen space. Shared by the wheel and the pinch so
// both keep the same point of the board pinned under the cursor or fingers.
export const zoomAt = (
    viewport: Viewport,
    rawZoom: number,
    anchor: Point,
): void => {
    const newZoom = clampZoom(rawZoom);
    const old = viewport.zoom;
    if (newZoom === old) return;
    const ratio = newZoom / old;
    viewport.offset = {
        x: anchor.x - ratio * (anchor.x - viewport.offset.x),
        y: anchor.y - ratio * (anchor.y - viewport.offset.y),
    };
    viewport.zoom = newZoom;
};
