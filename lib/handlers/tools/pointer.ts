import { CanvasState, ToolContext, ToolStrategy } from "@/types/canvasStateTypes";
import { getWorldPoint } from "../helpers";
import { getImageAtPoint, getResizeHandleAtPoint } from "@/lib/imageUtils";
import {
    imageIntersectsRect,
    normaliseRect,
    pointInRect,
    Rect,
    strokeIntersectsRect,
} from "@/lib/genometry";

// A plain click is a zero-length drag, so click-to-select an image and
// drag-to-marquee are the same gesture, separated only by distance.

const MIN_IMAGE_SIZE = 20;
// shorter than this counts as a click, i.e. deselect
const MIN_DRAG = 4;
// slack so the selection border itself can be grabbed
const DRAG_HIT_PADDING = 4;

const clearMarquee = (state: CanvasState) => {
    state.selectedStrokeIds = [];
    state.selectedImageIds = [];
    state.selectorRect = null;
    state.selectorRectOrigin = null;
    state.selectorStart = null;
    state.selectorDragStart = null;
    state.selectorDelta = { x: 0, y: 0 };
    state.selectorImageOrigins.clear();
};

const isTransformingImage = (state: CanvasState) =>
    state.selectedImageId !== null &&
    (state.activeResizeHandle !== null || state.imageDragOffset !== null);

const onDown = ({ e, state }: ToolContext) => {
    const worldPoint = getWorldPoint(e, state.viewport);

    // 1. grab an existing marquee selection by its box
    const hasSelection =
        state.selectedStrokeIds.length > 0 || state.selectedImageIds.length > 0;

    if (hasSelection && state.selectorRect) {
        const hitRect: Rect = {
            x: state.selectorRect.x - DRAG_HIT_PADDING,
            y: state.selectorRect.y - DRAG_HIT_PADDING,
            width: state.selectorRect.width + DRAG_HIT_PADDING * 2,
            height: state.selectorRect.height + DRAG_HIT_PADDING * 2,
        };

        if (pointInRect(worldPoint, hitRect)) {
            state.selectorDragStart = worldPoint;
            state.selectorDelta = { x: 0, y: 0 };
            state.selectorRectOrigin = { ...state.selectorRect };

            state.selectorImageOrigins.clear();
            for (const img of state.pastedImages) {
                if (state.selectedImageIds.includes(img.id)) {
                    state.selectorImageOrigins.set(img.id, {
                        x: img.x,
                        y: img.y,
                    });
                }
            }
            return;
        }
    }

    // 2. press on an image — select it, and move or resize it in the same drag
    const img = getImageAtPoint(state.pastedImages, worldPoint);
    if (img) {
        clearMarquee(state);
        state.selectedImageId = img.id;

        const handle = getResizeHandleAtPoint(img, worldPoint);
        if (handle) {
            state.activeResizeHandle = handle;
            return;
        }

        state.imageDragOffset = {
            x: worldPoint.x - img.x,
            y: worldPoint.y - img.y,
        };
        return;
    }

    // 3. press on empty board — start a marquee
    state.selectedImageId = null;
    clearMarquee(state);
    state.selectorStart = worldPoint;
    state.selectorRect = {
        x: worldPoint.x,
        y: worldPoint.y,
        width: 0,
        height: 0,
    };
};

const onMove = ({ e, state }: ToolContext) => {
    const worldPoint = getWorldPoint(e, state.viewport);

    // 1. moving or resizing the single image the press landed on
    if (isTransformingImage(state)) {
        const img = state.pastedImages.find(
            (i) => i.id === state.selectedImageId,
        );
        if (!img) return;

        if (state.activeResizeHandle) {
            const right = img.x + img.width;
            const bottom = img.y + img.height;

            const aspectRatio = img.width / img.height;

            switch (state.activeResizeHandle) {
                case "se": {
                    let newWidth = worldPoint.x - img.x;
                    newWidth = Math.max(MIN_IMAGE_SIZE, newWidth);

                    img.width = newWidth;
                    img.height = newWidth / aspectRatio;
                    break;
                }

                case "sw": {
                    let newWidth = right - worldPoint.x;
                    newWidth = Math.max(MIN_IMAGE_SIZE, newWidth);

                    img.width = newWidth;
                    img.height = newWidth / aspectRatio;

                    img.x = right - img.width;
                    break;
                }

                case "ne": {
                    let newWidth = worldPoint.x - img.x;
                    newWidth = Math.max(MIN_IMAGE_SIZE, newWidth);

                    img.width = newWidth;
                    img.height = newWidth / aspectRatio;

                    img.y = bottom - img.height;
                    break;
                }

                case "nw": {
                    let newWidth = right - worldPoint.x;
                    newWidth = Math.max(MIN_IMAGE_SIZE, newWidth);

                    img.width = newWidth;
                    img.height = newWidth / aspectRatio;

                    img.x = right - img.width;
                    img.y = bottom - img.height;
                    break;
                }
            }
        } else if (state.imageDragOffset) {
            img.x = worldPoint.x - state.imageDragOffset.x;
            img.y = worldPoint.y - state.imageDragOffset.y;
        }
        return;
    }

    // 2. dragging a whole marquee selection
    if (state.selectorDragStart) {
        const dx = worldPoint.x - state.selectorDragStart.x;
        const dy = worldPoint.y - state.selectorDragStart.y;
        state.selectorDelta = { x: dx, y: dy };

        if (state.selectorRectOrigin) {
            state.selectorRect = {
                ...state.selectorRectOrigin,
                x: state.selectorRectOrigin.x + dx,
                y: state.selectorRectOrigin.y + dy,
            };
        }

        for (const img of state.pastedImages) {
            const origin = state.selectorImageOrigins.get(img.id);
            if (origin) {
                img.x = origin.x + dx;
                img.y = origin.y + dy;
            }
        }
        return;
    }

    // 3. sizing the marquee
    if (state.selectorStart) {
        state.selectorRect = {
            x: state.selectorStart.x,
            y: state.selectorStart.y,
            width: worldPoint.x - state.selectorStart.x,
            height: worldPoint.y - state.selectorStart.y,
        };
    }
};

const onUp = ({ state, strokes, callbacks }: ToolContext) => {
    // 1. commit a single image's move or resize — handleMouseUp clears the
    // gesture state only after this runs, so it still reads here.
    if (isTransformingImage(state)) {
        const id = state.selectedImageId!;
        const img = state.pastedImages.find((i) => i.id === id);
        if (img) {
            callbacks.onImageMoved(id, {
                x: img.x,
                y: img.y,
                width: img.width,
                height: img.height,
            });
        }
        return;
    }

    // 2. commit a marquee selection drag
    if (state.selectorDragStart) {
        const { x: dx, y: dy } = state.selectorDelta;

        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
            const moves = state.selectedStrokeIds.flatMap((id) => {
                const stroke = (strokes ?? []).find((s) => s.id === id);
                if (!stroke) return [];
                return [
                    {
                        id,
                        points: stroke.points.map((p) => ({
                            x: p.x + dx,
                            y: p.y + dy,
                        })),
                    },
                ];
            });
            if (moves.length > 0) callbacks.onMoveStrokes(moves);

            for (const img of state.pastedImages) {
                if (state.selectedImageIds.includes(img.id)) {
                    callbacks.onImageMoved(img.id, { x: img.x, y: img.y });
                }
            }
        }

        state.selectorDragStart = null;
        state.selectorDelta = { x: 0, y: 0 };
        state.selectorImageOrigins.clear();
        return;
    }

    // 3. resolve what the marquee swept up
    if (state.selectorRect) {
        const normalised = normaliseRect(state.selectorRect);

        if (normalised.width > MIN_DRAG || normalised.height > MIN_DRAG) {
            state.selectedStrokeIds = (strokes ?? [])
                .filter((s) => strokeIntersectsRect(s, normalised))
                .map((s) => s.id);
            state.selectedImageIds = state.pastedImages
                .filter((img) => imageIntersectsRect(img, normalised))
                .map((img) => img.id);
            // The rect doubles as the drag hit area, so drop it when empty.
            const hasSelection =
                state.selectedStrokeIds.length > 0 ||
                state.selectedImageIds.length > 0;
            state.selectorRect = hasSelection ? normalised : null;
        } else {
            state.selectedStrokeIds = [];
            state.selectedImageIds = [];
            state.selectorRect = null;
        }

        state.selectorStart = null;
    }
};

export const pointerStrategy: ToolStrategy = { onDown, onMove, onUp };
