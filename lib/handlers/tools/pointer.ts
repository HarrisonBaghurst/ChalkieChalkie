import {
    CanvasState,
    ToolContext,
    ToolStrategy,
} from "@/types/canvasStateTypes";
import { toWorldPoint } from "../helpers";
import { getImageAtPoint, getResizeHandleAtPoint } from "@/lib/imageUtils";
import { PastedImage, ResizeHandle, ResizeHandleKey } from "@/types/imageTypes";
import { Point } from "@/types/strokeTypes";
import {
    imageWithinRect,
    normaliseRect,
    pointInRect,
    Rect,
    selectedItemBounds,
    strokeIntersectsRect,
    unionRects,
} from "@/lib/genometry";

const MIN_IMAGE_SIZE = 20;
const MIN_DRAG = 6;
const DRAG_HIT_PADDING = 10;

const RESIZE_CURSORS: Record<ResizeHandleKey, string> = {
    nw: "nwse-resize",
    se: "nwse-resize",
    ne: "nesw-resize",
    sw: "nesw-resize",
};

const selectableImages = (state: CanvasState) =>
    state.pastedImages.filter((img) => !state.lockedImageIds.has(img.id));

const grabHitRect = (rect: Rect, zoom: number): Rect => {
    const pad = DRAG_HIT_PADDING / zoom;
    return {
        x: rect.x - pad,
        y: rect.y - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
    };
};

const selectedImage = (state: CanvasState): PastedImage | null =>
    selectableImages(state).find((img) => img.id === state.selectedImageId) ??
    null;

const hitSelectedImage = (
    state: CanvasState,
    point: Point,
): { img: PastedImage; handle: ResizeHandle } | null => {
    const img = selectedImage(state);
    if (!img) return null;

    const handle = getResizeHandleAtPoint(img, point, state.viewport.zoom);
    if (handle) return { img, handle };

    return pointInRect(point, img) ? { img, handle: null } : null;
};

const clearMarquee = (state: CanvasState) => {
    state.selectedStrokeIds = [];
    state.selectedImageIds = [];
    state.marqueeRect = null;
    state.selectionBounds = null;
    state.selectionBoundsOrigin = null;
    state.selectorStart = null;
    state.selectorDragStart = null;
    state.selectorDelta = { x: 0, y: 0 };
    state.selectorImageOrigins.clear();
};

const isTransformingImage = (state: CanvasState) =>
    state.selectedImageId !== null &&
    (state.activeResizeHandle !== null || state.imageDragOffset !== null);

export const isImageUnderLocalTransform = (
    state: CanvasState,
    id: string,
): boolean => {
    if (state.selectedImageId === id && isTransformingImage(state)) return true;
    return (
        state.selectorDragStart !== null && state.selectorImageOrigins.has(id)
    );
};

export const pointerCursor = (state: CanvasState): string => {
    if (state.activeResizeHandle)
        return RESIZE_CURSORS[state.activeResizeHandle];
    if (state.selectorDragStart || state.imageDragOffset) return "grabbing";
    if (state.selectorStart) return "default";

    const point = state.cursorPosition;
    const { zoom } = state.viewport;
    const hasSelection =
        state.selectedStrokeIds.length > 0 || state.selectedImageIds.length > 0;

    if (
        hasSelection &&
        state.selectionBounds &&
        pointInRect(point, grabHitRect(state.selectionBounds, zoom))
    ) {
        return "grab";
    }

    const hit = hitSelectedImage(state, point);
    if (hit) return hit.handle ? RESIZE_CURSORS[hit.handle] : "grab";

    return "default";
};

export const abortPointerGesture = (state: CanvasState) => {
    if (state.imageTransformOrigin && state.selectedImageId) {
        const img = state.pastedImages.find(
            (i) => i.id === state.selectedImageId,
        );
        if (img) Object.assign(img, state.imageTransformOrigin);
    }

    if (state.selectorDragStart) {
        for (const img of state.pastedImages) {
            const origin = state.selectorImageOrigins.get(img.id);
            if (origin) {
                img.x = origin.x;
                img.y = origin.y;
            }
        }
        if (state.selectionBoundsOrigin) {
            state.selectionBounds = { ...state.selectionBoundsOrigin };
        }
    }

    state.imageTransformOrigin = null;
    state.imageDragOffset = null;
    state.activeResizeHandle = null;
    state.selectorDragStart = null;
    state.selectorDelta = { x: 0, y: 0 };
    state.selectorImageOrigins.clear();
    state.marqueeRect = null;
    state.selectorStart = null;
};

const onDown = ({ e, state }: ToolContext) => {
    const worldPoint = toWorldPoint(e, state);
    const { zoom } = state.viewport;

    // 1. grab an existing marquee selection by its box
    const hasSelection =
        state.selectedStrokeIds.length > 0 || state.selectedImageIds.length > 0;

    if (hasSelection && state.selectionBounds) {
        if (pointInRect(worldPoint, grabHitRect(state.selectionBounds, zoom))) {
            state.selectorDragStart = worldPoint;
            state.selectorDelta = { x: 0, y: 0 };
            state.selectionBoundsOrigin = { ...state.selectionBounds };

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

    // 2. move or resize the image that is already selected
    const hit = hitSelectedImage(state, worldPoint);
    if (hit) {
        const { img, handle } = hit;
        state.imageTransformOrigin = {
            x: img.x,
            y: img.y,
            width: img.width,
            height: img.height,
        };

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

    // 3. anything else starts a marquee, images included — which is the only
    // way to reach strokes drawn over one. Whether the gesture was really a
    // click, and so selects the image beneath it instead, is settled in onUp.
    state.selectedImageId = null;
    state.imageTransformOrigin = null;
    clearMarquee(state);
    state.selectorStart = worldPoint;
    state.marqueeRect = {
        x: worldPoint.x,
        y: worldPoint.y,
        width: 0,
        height: 0,
    };
};

const onMove = ({ e, state }: ToolContext) => {
    const worldPoint = toWorldPoint(e, state);

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

        if (state.selectionBoundsOrigin) {
            state.selectionBounds = {
                ...state.selectionBoundsOrigin,
                x: state.selectionBoundsOrigin.x + dx,
                y: state.selectionBoundsOrigin.y + dy,
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
        state.marqueeRect = {
            x: state.selectorStart.x,
            y: state.selectorStart.y,
            width: worldPoint.x - state.selectorStart.x,
            height: worldPoint.y - state.selectorStart.y,
        };
    }
};

const onUp = ({ state, strokes, callbacks }: ToolContext) => {
    // 1. commit a single image's move or resize — useCanvasInput clears the
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

    // 3. resolve what the marquee swept up, or — if it never travelled far
    // enough to be a drag — treat the press as a click on whatever is under it
    if (state.marqueeRect) {
        const normalised = normaliseRect(state.marqueeRect);
        const minDrag = MIN_DRAG / state.viewport.zoom;

        state.selectedStrokeIds = [];
        state.selectedImageIds = [];

        if (normalised.width > minDrag || normalised.height > minDrag) {
            state.selectedStrokeIds = (strokes ?? [])
                .filter(
                    (s) =>
                        !state.lockedStrokeIds.has(s.id) &&
                        strokeIntersectsRect(s, normalised),
                )
                .map((s) => s.id);
            state.selectedImageIds = selectableImages(state)
                .filter((img) => imageWithinRect(img, normalised))
                .map((img) => img.id);
        } else if (state.selectorStart) {
            const clicked = getImageAtPoint(
                selectableImages(state),
                state.selectorStart,
            );
            state.selectedImageId = clicked?.id ?? null;
        }
        state.selectionBounds = unionRects(
            selectedItemBounds(
                strokes ?? [],
                state.pastedImages,
                state.selectedStrokeIds,
                state.selectedImageIds,
            ),
        );
        state.marqueeRect = null;
        state.selectorStart = null;
    }
};

export const pointerStrategy: ToolStrategy = { onDown, onMove, onUp };
