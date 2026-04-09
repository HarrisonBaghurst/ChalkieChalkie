import { PastedImage, ResizeHandle, PastedImageMeta } from "@/types/imageTypes";
import { Point, Stroke } from "@/types/strokeTypes";
import { Tools } from "@/types/toolTypes";
import { RefObject } from "react";
import { handlePenUp } from "./tools/pen";
import { handlePointerUp } from "./tools/pointer";
import { handlePanUp } from "./tools/pan";

interface HandleMouseUpProps {
    e: React.MouseEvent;
    isDrawingRef: RefObject<boolean>;
    currentStrokeRef: RefObject<Stroke | null>;
    panStartRef: RefObject<Point | null>;
    lastPanOffsetRef: RefObject<Point>;
    panOffsetRef: RefObject<Point>;
    currentToolRef: RefObject<Tools>;
    pastedImagesRef: RefObject<PastedImage[]>;
    selectedImageIdRef: RefObject<string | null>;
    imageDragOffsetRef: RefObject<Point | null>;
    activeResizeHandleRef: RefObject<ResizeHandle>;
    onStrokeFinished: (stroke: Stroke) => void;
    onImageMoved: (id: string, changes: Partial<PastedImageMeta>) => void;
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
