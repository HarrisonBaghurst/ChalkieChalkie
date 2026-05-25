import { RefObject } from "react";
import { Point, Stroke } from "@/types/strokeTypes";
import { PastedImage, PastedImageMeta } from "@/types/imageTypes";
import { getWorldPoint } from "../helpers";
import {
    imageIntersectsRect,
    normaliseRect,
    pointInRect,
    Rect,
    strokeIntersectsRect,
} from "@/lib/genometry";

// ─── DOWN ─────────────────────────────────────────────────────────────────────

interface HandleSelectorDownProps {
    e: React.MouseEvent;
    lastPanOffsetRef: RefObject<Point>;
    strokes: readonly Stroke[] | null;
    pastedImagesRef: RefObject<PastedImage[]>;
    selectorRectRef: RefObject<Rect | null>;
    selectorRectOriginRef: RefObject<Rect | null>;
    selectorStartRef: RefObject<Point | null>;
    selectedStrokeIdsRef: RefObject<string[]>;
    selectedImageIdsRef: RefObject<string[]>;
    selectorDragStartRef: RefObject<Point | null>;
    selectorDeltaRef: RefObject<Point>;
    selectorImageOriginsRef: RefObject<Map<string, Point>>;
}

export const handleSelectorDown = ({
    e,
    lastPanOffsetRef,
    strokes,
    pastedImagesRef,
    selectorRectRef,
    selectorRectOriginRef,
    selectorStartRef,
    selectedStrokeIdsRef,
    selectedImageIdsRef,
    selectorDragStartRef,
    selectorDeltaRef,
    selectorImageOriginsRef,
}: HandleSelectorDownProps) => {
    const worldPoint = getWorldPoint({ e, lastPanOffsetRef });

    const hasSelection =
        selectedStrokeIdsRef.current.length > 0 ||
        selectedImageIdsRef.current.length > 0;

    if (hasSelection && selectorRectRef.current) {
        const hitRect: Rect = {
            x: selectorRectRef.current.x - 4,
            y: selectorRectRef.current.y - 4,
            width: selectorRectRef.current.width + 8,
            height: selectorRectRef.current.height + 8,
        };

        if (pointInRect(worldPoint, hitRect)) {
            // Enter drag phase — snapshot rect and image origins
            selectorDragStartRef.current = worldPoint;
            selectorDeltaRef.current = { x: 0, y: 0 };
            selectorRectOriginRef.current = { ...selectorRectRef.current };

            selectorImageOriginsRef.current.clear();
            for (const img of pastedImagesRef.current) {
                if (selectedImageIdsRef.current.includes(img.id)) {
                    selectorImageOriginsRef.current.set(img.id, { x: img.x, y: img.y });
                }
            }
            return;
        }
    }

    // Start new selection
    selectedStrokeIdsRef.current = [];
    selectedImageIdsRef.current = [];
    selectorDragStartRef.current = null;
    selectorDeltaRef.current = { x: 0, y: 0 };
    selectorStartRef.current = worldPoint;
    selectorRectRef.current = { x: worldPoint.x, y: worldPoint.y, width: 0, height: 0 };
};

// ─── MOVE ─────────────────────────────────────────────────────────────────────

interface HandleSelectorMoveProps {
    e: React.MouseEvent;
    lastPanOffsetRef: RefObject<Point>;
    pastedImagesRef: RefObject<PastedImage[]>;
    selectorRectRef: RefObject<Rect | null>;
    selectorRectOriginRef: RefObject<Rect | null>;
    selectorStartRef: RefObject<Point | null>;
    selectedImageIdsRef: RefObject<string[]>;
    selectorDragStartRef: RefObject<Point | null>;
    selectorDeltaRef: RefObject<Point>;
    selectorImageOriginsRef: RefObject<Map<string, Point>>;
}

export const handleSelectorMove = ({
    e,
    lastPanOffsetRef,
    pastedImagesRef,
    selectorRectRef,
    selectorRectOriginRef,
    selectorStartRef,
    selectedImageIdsRef,
    selectorDragStartRef,
    selectorDeltaRef,
    selectorImageOriginsRef,
}: HandleSelectorMoveProps) => {
    const worldPoint = getWorldPoint({ e, lastPanOffsetRef });

    if (selectorDragStartRef.current) {
        const dx = worldPoint.x - selectorDragStartRef.current.x;
        const dy = worldPoint.y - selectorDragStartRef.current.y;
        selectorDeltaRef.current = { x: dx, y: dy };

        // Translate selection box live from its snapshotted origin
        if (selectorRectOriginRef.current) {
            selectorRectRef.current = {
                ...selectorRectOriginRef.current,
                x: selectorRectOriginRef.current.x + dx,
                y: selectorRectOriginRef.current.y + dy,
            };
        }

        // Move images live via local ref (same pattern as pointer tool)
        for (const img of pastedImagesRef.current) {
            const origin = selectorImageOriginsRef.current.get(img.id);
            if (origin) {
                img.x = origin.x + dx;
                img.y = origin.y + dy;
            }
        }
        return;
    }

    if (selectorStartRef.current) {
        selectorRectRef.current = {
            x: selectorStartRef.current.x,
            y: selectorStartRef.current.y,
            width: worldPoint.x - selectorStartRef.current.x,
            height: worldPoint.y - selectorStartRef.current.y,
        };
    }
};

// ─── UP ───────────────────────────────────────────────────────────────────────

interface HandleSelectorUpProps {
    strokes: readonly Stroke[] | null;
    pastedImagesRef: RefObject<PastedImage[]>;
    selectorRectRef: RefObject<Rect | null>;
    selectorStartRef: RefObject<Point | null>;
    selectedStrokeIdsRef: RefObject<string[]>;
    selectedImageIdsRef: RefObject<string[]>;
    selectorDragStartRef: RefObject<Point | null>;
    selectorDeltaRef: RefObject<Point>;
    selectorImageOriginsRef: RefObject<Map<string, Point>>;
    onMoveStrokes: (moves: { id: string; points: Point[] }[]) => void;
    onMoveImage: (id: string, changes: Partial<PastedImageMeta>) => void;
}

export const handleSelectorUp = ({
    strokes,
    pastedImagesRef,
    selectorRectRef,
    selectorStartRef,
    selectedStrokeIdsRef,
    selectedImageIdsRef,
    selectorDragStartRef,
    selectorDeltaRef,
    selectorImageOriginsRef,
    onMoveStrokes,
    onMoveImage,
}: HandleSelectorUpProps) => {
    if (selectorDragStartRef.current) {
        const { x: dx, y: dy } = selectorDeltaRef.current;

        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
            // Commit stroke positions to Liveblocks
            const moves = selectedStrokeIdsRef.current.flatMap((id) => {
                const stroke = (strokes ?? []).find((s) => s.id === id);
                if (!stroke) return [];
                return [{ id, points: stroke.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) }];
            });
            if (moves.length > 0) onMoveStrokes(moves);

            // Commit image positions (already updated in local ref during move)
            for (const img of pastedImagesRef.current) {
                if (selectedImageIdsRef.current.includes(img.id)) {
                    onMoveImage(img.id, { x: img.x, y: img.y });
                }
            }

        }

        selectorDragStartRef.current = null;
        selectorDeltaRef.current = { x: 0, y: 0 };
        selectorImageOriginsRef.current.clear();
        return;
    }

    if (selectorRectRef.current) {
        const MIN_DRAG = 4;
        const normalised = normaliseRect(selectorRectRef.current);

        if (normalised.width > MIN_DRAG || normalised.height > MIN_DRAG) {
            selectedStrokeIdsRef.current = (strokes ?? [])
                .filter((s) => strokeIntersectsRect(s, normalised))
                .map((s) => s.id);
            selectedImageIdsRef.current = pastedImagesRef.current
                .filter((img) => imageIntersectsRect(img, normalised))
                .map((img) => img.id);
            // Only keep rect as drag hit area if something was actually selected
            const hasSelection =
                selectedStrokeIdsRef.current.length > 0 ||
                selectedImageIdsRef.current.length > 0;
            selectorRectRef.current = hasSelection ? normalised : null;
        } else {
            // Tiny drag treated as click — deselect
            selectedStrokeIdsRef.current = [];
            selectedImageIdsRef.current = [];
            selectorRectRef.current = null;
        }

        selectorStartRef.current = null;
    }
};
