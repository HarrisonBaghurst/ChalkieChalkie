import { PastedImage, ResizeHandle } from "@/types/imageTypes";
import { Point, Stroke } from "@/types/strokeTypes";
import { Tools } from "@/types/toolTypes";
import { RefObject } from "react";
import { handlePenMove } from "./tools/pen";
import { handlePointerMove } from "./tools/pointer";
import { handleEraserMove } from "./tools/eraser";
import { handlePanMove } from "./tools/pan";

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
