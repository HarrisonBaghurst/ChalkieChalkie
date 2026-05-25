import { PastedImage, ResizeHandle, PastedImageMeta } from "@/types/imageTypes";
import { Rect } from "@/lib/genometry";
import { Point, Stroke } from "@/types/strokeTypes";
import { Tools } from "@/types/toolTypes";
import { RefObject } from "react";
import { handlePenUp } from "./tools/pen";
import { handlePointerUp } from "./tools/pointer";
import { handlePanUp } from "./tools/pan";
import { handleSelectorUp } from "./tools/selector";

interface HandleMouseUpProps {
    e: React.MouseEvent;
    isDrawingRef: RefObject<boolean>;
    currentStrokeRef: RefObject<Stroke | null>;
    panStartRef: RefObject<Point | null>;
    lastPanOffsetRef: RefObject<Point>;
    panOffsetRef: RefObject<Point>;
    currentToolRef: RefObject<Tools>;
    strokes: readonly Stroke[] | null;
    pastedImagesRef: RefObject<PastedImage[]>;
    selectedImageIdRef: RefObject<string | null>;
    imageDragOffsetRef: RefObject<Point | null>;
    activeResizeHandleRef: RefObject<ResizeHandle>;
    onStrokeFinished: (stroke: Stroke) => void;
    onImageMoved: (id: string, changes: Partial<PastedImageMeta>) => void;
    selectorRectRef: RefObject<Rect | null>;
    selectorStartRef: RefObject<Point | null>;
    selectedStrokeIdsRef: RefObject<string[]>;
    selectedImageIdsRef: RefObject<string[]>;
    selectorDragStartRef: RefObject<Point | null>;
    selectorDeltaRef: RefObject<Point>;
    selectorImageOriginsRef: RefObject<Map<string, Point>>;
    onMoveStrokes: (moves: { id: string; points: Point[] }[]) => void;
}

export const handleMouseUp = ({
    e,
    currentToolRef,
    isDrawingRef,
    currentStrokeRef,
    onStrokeFinished,
    selectedImageIdRef,
    pastedImagesRef,
    onImageMoved,
    panStartRef,
    lastPanOffsetRef,
    panOffsetRef,
    imageDragOffsetRef,
    activeResizeHandleRef,
    strokes,
    selectorRectRef,
    selectorStartRef,
    selectedStrokeIdsRef,
    selectedImageIdsRef,
    selectorDragStartRef,
    selectorDeltaRef,
    selectorImageOriginsRef,
    onMoveStrokes,
}: HandleMouseUpProps) => {
    if (
        e.button === 0 &&
        currentToolRef.current === "pen" &&
        isDrawingRef.current
    ) {
        handlePenUp({
            e,
            isDrawingRef,
            currentStrokeRef,
            onStrokeFinished,
        });
    } else if (e.button === 0 && currentToolRef.current === "pointer") {
        handlePointerUp({
            selectedImageIdRef,
            pastedImagesRef,
            onImageMoved,
        });
    } else if (e.button === 0 && currentToolRef.current === "selector") {
        handleSelectorUp({
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
            onMoveImage: onImageMoved,
        });
    } else if (e.button === 2) {
        handlePanUp({
            panStartRef,
            lastPanOffsetRef,
            panOffsetRef,
        });
    }

    imageDragOffsetRef.current = null;
    activeResizeHandleRef.current = null;
};
