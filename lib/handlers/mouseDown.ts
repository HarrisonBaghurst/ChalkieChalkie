import { PastedImage, ResizeHandle } from "@/types/imageTypes";
import { Rect } from "@/lib/genometry";
import { Point, Stroke } from "@/types/strokeTypes";
import { Tools } from "@/types/toolTypes";
import { RefObject } from "react";
import { handlePenDown } from "./tools/pen";
import { handlePointerDown } from "./tools/pointer";
import { handlePanDown } from "./tools/pan";
import { handleSelectorDown } from "./tools/selector";
import { handleHighlighterDown } from "./tools/highlighter";

interface HandleMouseDownProps {
    e: React.MouseEvent;
    currentColourRef: RefObject<string>;
    highlightColourRef: RefObject<string>;
    currentStrokeRef: RefObject<Stroke | null>;
    isDrawingRef: RefObject<boolean>;
    panStartRef: RefObject<Point | null>;
    lastPanOffsetRef: RefObject<Point>;
    currentToolRef: RefObject<Tools>;
    strokes: readonly Stroke[] | null;
    pastedImagesRef: RefObject<PastedImage[]>;
    selectedImageIdRef: RefObject<string | null>;
    imageDragOffsetRef: RefObject<Point | null>;
    activeResizeHandleRef: RefObject<ResizeHandle>;
    selectorRectRef: RefObject<Rect | null>;
    selectorRectOriginRef: RefObject<Rect | null>;
    selectorStartRef: RefObject<Point | null>;
    selectedStrokeIdsRef: RefObject<string[]>;
    selectedImageIdsRef: RefObject<string[]>;
    selectorDragStartRef: RefObject<Point | null>;
    selectorDeltaRef: RefObject<Point>;
    selectorImageOriginsRef: RefObject<Map<string, Point>>;
}

export const handleMouseDown = ({
    e,
    currentColourRef,
    highlightColourRef,
    currentStrokeRef,
    isDrawingRef,
    panStartRef,
    lastPanOffsetRef,
    currentToolRef,
    strokes,
    pastedImagesRef,
    selectedImageIdRef,
    imageDragOffsetRef,
    activeResizeHandleRef,
    selectorRectRef,
    selectorRectOriginRef,
    selectorStartRef,
    selectedStrokeIdsRef,
    selectedImageIdsRef,
    selectorDragStartRef,
    selectorDeltaRef,
    selectorImageOriginsRef,
}: HandleMouseDownProps) => {
    e.preventDefault();

    if (e.buttons === 1 && currentToolRef.current === "pen") {
        handlePenDown({
            e,
            currentStrokeRef,
            currentColourRef,
            isDrawingRef,
            lastPanOffsetRef,
        });
    } else if (e.buttons === 1 && currentToolRef.current === "pointer") {
        handlePointerDown({
            e,
            lastPanOffsetRef,
            pastedImagesRef,
            selectedImageIdRef,
            activeResizeHandleRef,
            imageDragOffsetRef,
        });
    } else if (e.buttons === 1 && currentToolRef.current === "selector") {
        handleSelectorDown({
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
        });
    } else if (e.buttons === 1 && currentToolRef.current === "highlighter") {
        handleHighlighterDown({
            e,
            currentStrokeRef,
            highlightColourRef,
            isDrawingRef,
            lastPanOffsetRef,
        });
    } else if (e.buttons === 2) {
        handlePanDown({
            e,
            panStartRef,
        });
    }
};
