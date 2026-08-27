import { Point } from "@/types/strokeTypes";
import { Viewport } from "@/types/canvasStateTypes";

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4.0;
export const ZOOM_RATIO = 1.1;
const INSERT_FIT_RATIO = 0.6;

type Size = { width: number; height: number };

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

export const viewportCentre = (viewport: Viewport, rect: Size): Point => ({
    x: (rect.width / 2 - viewport.offset.x) / viewport.zoom,
    y: (rect.height / 2 - viewport.offset.y) / viewport.zoom,
});

// Capped at 1 so a small screenshot keeps its own size rather than being blown
// up to fill the board.
export const fitToViewport = (
    natural: Size,
    viewport: Viewport,
    rect: Size,
): Size => {
    const maxWidth = (rect.width / viewport.zoom) * INSERT_FIT_RATIO;
    const maxHeight = (rect.height / viewport.zoom) * INSERT_FIT_RATIO;
    // Before the ResizeObserver's first callback the rect is still zero.
    if (maxWidth <= 0 || maxHeight <= 0) return natural;

    const scale = Math.min(
        1,
        maxWidth / natural.width,
        maxHeight / natural.height,
    );
    return {
        width: natural.width * scale,
        height: natural.height * scale,
    };
};
