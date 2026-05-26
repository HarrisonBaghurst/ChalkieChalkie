import { PastedImage, ResizeHandle } from "@/types/imageTypes";
import { Rect } from "@/lib/genometry";
import { Point, Stroke } from "@/types/strokeTypes";
import { Tools } from "@/types/toolTypes";
import { RefObject } from "react";
import { handlePenMove } from "./tools/pen";
import { handlePointerMove } from "./tools/pointer";
import { handleEraserMove } from "./tools/eraser";
import { handlePanMove } from "./tools/pan";
import { handleSelectorMove } from "./tools/selector";
import { handleHighlighterMove } from "./tools/highlighter";

interface HandleMouseMoveProps {
    e: React.MouseEvent;
    currentStrokeRef: RefObject<Stroke | null>;
    isDrawingRef: RefObject<boolean>;
    panStartRef: RefObject<Point | null>;
    panOffsetRef: RefObject<Point>;
    lastPanOffsetRef: RefObject<Point>;
    currentToolRef: RefObject<Tools>;
    strokes: readonly Stroke[] | null;
    onErase: (strokeIds: string[]) => void;
    pastedImagesRef: RefObject<PastedImage[]>;
    selectedImageIdRef: RefObject<string | null>;
    imageDragOffsetRef: RefObject<Point | null>;
    activeResizeHandleRef: RefObject<ResizeHandle>;
    selectorRectRef: RefObject<Rect | null>;
    selectorRectOriginRef: RefObject<Rect | null>;
    selectorStartRef: RefObject<Point | null>;
    selectedImageIdsRef: RefObject<string[]>;
    selectorDragStartRef: RefObject<Point | null>;
    selectorDeltaRef: RefObject<Point>;
    selectorImageOriginsRef: RefObject<Map<string, Point>>;
}

export const handleMouseMove = (() => {
    let lastTime = 0;
    const THROTTLE_MS = 16; // ~60 FPS

    return ({
        e,
        currentStrokeRef,
        isDrawingRef,
        panStartRef,
        panOffsetRef,
        lastPanOffsetRef,
        currentToolRef,
        strokes,
        onErase,
        pastedImagesRef,
        selectedImageIdRef,
        imageDragOffsetRef,
        activeResizeHandleRef,
        selectorRectRef,
        selectorRectOriginRef,
        selectorStartRef,
        selectedImageIdsRef,
        selectorDragStartRef,
        selectorDeltaRef,
        selectorImageOriginsRef,
    }: HandleMouseMoveProps) => {
        const now = performance.now();
        if (now - lastTime < THROTTLE_MS) return;
        lastTime = now;

        if (
            e.buttons === 1 &&
            currentToolRef.current === "pen" &&
            isDrawingRef.current &&
            currentStrokeRef.current
        ) {
            handlePenMove({
                e,
                currentStrokeRef,
                lastPanOffsetRef,
            });
        } else if (
            e.buttons === 1 &&
            currentToolRef.current === "eraser" &&
            strokes
        ) {
            handleEraserMove({
                e,
                strokes,
                lastPanOffsetRef,
                onErase,
            });
        } else if (e.buttons === 1 && currentToolRef.current === "pointer") {
            handlePointerMove({
                e,
                lastPanOffsetRef,
                pastedImagesRef,
                selectedImageIdRef,
                activeResizeHandleRef,
                imageDragOffsetRef,
            });
        } else if (
            e.buttons === 1 &&
            currentToolRef.current === "highlighter" &&
            isDrawingRef.current &&
            currentStrokeRef.current
        ) {
            handleHighlighterMove({
                e,
                currentStrokeRef,
                lastPanOffsetRef,
            });
        } else if (e.buttons === 1 && currentToolRef.current === "selector") {
            handleSelectorMove({
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
            });
        } else if (e.buttons === 2 && panStartRef.current) {
            handlePanMove({
                e,
                panOffsetRef,
                lastPanOffsetRef,
                panStartRef,
            });
        }
    };
})();
