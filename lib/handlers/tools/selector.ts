import { ToolContext, ToolStrategy } from "@/types/canvasStateTypes";
import { getWorldPoint } from "../helpers";
import {
    imageIntersectsRect,
    normaliseRect,
    pointInRect,
    Rect,
    strokeIntersectsRect,
} from "@/lib/genometry";

// ─── DOWN ─────────────────────────────────────────────────────────────────────

const onDown = ({ e, state }: ToolContext) => {
    const worldPoint = getWorldPoint(e, state.viewport);

    const hasSelection =
        state.selectedStrokeIds.length > 0 ||
        state.selectedImageIds.length > 0;

    if (hasSelection && state.selectorRect) {
        const hitRect: Rect = {
            x: state.selectorRect.x - 4,
            y: state.selectorRect.y - 4,
            width: state.selectorRect.width + 8,
            height: state.selectorRect.height + 8,
        };

        if (pointInRect(worldPoint, hitRect)) {
            // Enter drag phase — snapshot rect and image origins
            state.selectorDragStart = worldPoint;
            state.selectorDelta = { x: 0, y: 0 };
            state.selectorRectOrigin = { ...state.selectorRect };

            state.selectorImageOrigins.clear();
            for (const img of state.pastedImages) {
                if (state.selectedImageIds.includes(img.id)) {
                    state.selectorImageOrigins.set(img.id, { x: img.x, y: img.y });
                }
            }
            return;
        }
    }

    // Start new selection
    state.selectedStrokeIds = [];
    state.selectedImageIds = [];
    state.selectorDragStart = null;
    state.selectorDelta = { x: 0, y: 0 };
    state.selectorStart = worldPoint;
    state.selectorRect = { x: worldPoint.x, y: worldPoint.y, width: 0, height: 0 };
};

// ─── MOVE ─────────────────────────────────────────────────────────────────────

const onMove = ({ e, state }: ToolContext) => {
    const worldPoint = getWorldPoint(e, state.viewport);

    if (state.selectorDragStart) {
        const dx = worldPoint.x - state.selectorDragStart.x;
        const dy = worldPoint.y - state.selectorDragStart.y;
        state.selectorDelta = { x: dx, y: dy };

        // Translate selection box live from its snapshotted origin
        if (state.selectorRectOrigin) {
            state.selectorRect = {
                ...state.selectorRectOrigin,
                x: state.selectorRectOrigin.x + dx,
                y: state.selectorRectOrigin.y + dy,
            };
        }

        // Move images live via local ref (same pattern as pointer tool)
        for (const img of state.pastedImages) {
            const origin = state.selectorImageOrigins.get(img.id);
            if (origin) {
                img.x = origin.x + dx;
                img.y = origin.y + dy;
            }
        }
        return;
    }

    if (state.selectorStart) {
        state.selectorRect = {
            x: state.selectorStart.x,
            y: state.selectorStart.y,
            width: worldPoint.x - state.selectorStart.x,
            height: worldPoint.y - state.selectorStart.y,
        };
    }
};

// ─── UP ───────────────────────────────────────────────────────────────────────

const onUp = ({ state, strokes, callbacks }: ToolContext) => {
    if (state.selectorDragStart) {
        const { x: dx, y: dy } = state.selectorDelta;

        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
            // Commit stroke positions to Liveblocks
            const moves = state.selectedStrokeIds.flatMap((id) => {
                const stroke = (strokes ?? []).find((s) => s.id === id);
                if (!stroke) return [];
                return [{ id, points: stroke.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) }];
            });
            if (moves.length > 0) callbacks.onMoveStrokes(moves);

            // Commit image positions (already updated in local ref during move)
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

    if (state.selectorRect) {
        const MIN_DRAG = 4;
        const normalised = normaliseRect(state.selectorRect);

        if (normalised.width > MIN_DRAG || normalised.height > MIN_DRAG) {
            state.selectedStrokeIds = (strokes ?? [])
                .filter((s) => strokeIntersectsRect(s, normalised))
                .map((s) => s.id);
            state.selectedImageIds = state.pastedImages
                .filter((img) => imageIntersectsRect(img, normalised))
                .map((img) => img.id);
            // Only keep rect as drag hit area if something was actually selected
            const hasSelection =
                state.selectedStrokeIds.length > 0 ||
                state.selectedImageIds.length > 0;
            state.selectorRect = hasSelection ? normalised : null;
        } else {
            // Tiny drag treated as click — deselect
            state.selectedStrokeIds = [];
            state.selectedImageIds = [];
            state.selectorRect = null;
        }

        state.selectorStart = null;
    }
};

export const selectorStrategy: ToolStrategy = { onDown, onMove, onUp };
