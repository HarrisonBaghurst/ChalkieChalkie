import { PastedImage, ResizeHandle } from "@/types/imageTypes";
import { Point, Stroke } from "@/types/strokeTypes";
import { Tools } from "@/types/toolTypes";
import { RefObject } from "react";
import { handlePenDown } from "./tools/pen";
import { handlePointerDown } from "./tools/pointer";
import { handlePanDown } from "./tools/pan";

interface HandleMouseDownProps {
    e: React.MouseEvent;
    currentColourRef: RefObject<string>;
    currentStrokeRef: RefObject<Stroke | null>;
    isDrawingRef: RefObject<boolean>;
    panStartRef: RefObject<Point | null>;
    lastPanOffsetRef: RefObject<Point>;
    currentToolRef: RefObject<Tools>;
    pastedImagesRef: RefObject<PastedImage[]>;
    selectedImageIdRef: RefObject<string | null>;
    imageDragOffsetRef: RefObject<Point | null>;
    activeResizeHandleRef: RefObject<ResizeHandle>;
}

export const handleMouseDown = ({
    e,
    currentColourRef,
    currentStrokeRef,
    isDrawingRef,
    panStartRef,
    lastPanOffsetRef,
    currentToolRef,
    pastedImagesRef,
    selectedImageIdRef,
    imageDragOffsetRef,
    activeResizeHandleRef,
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
    } else if (e.buttons === 2) {
        handlePanDown({
            e,
            panStartRef,
        });
    }
};
