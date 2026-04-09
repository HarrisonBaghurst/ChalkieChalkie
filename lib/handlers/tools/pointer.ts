import { Ref, RefObject } from "react";
import { getMousePos, getWorldPoint } from "../helpers";
import { Point } from "@/types/strokeTypes";
import { PastedImage, PastedImageMeta, ResizeHandle } from "@/types/imageTypes";
import { getImageAtPoint, getResizeHandleAtPoint } from "@/lib/imageUtils";

interface HandlePointerDownProps {
    e: React.MouseEvent;
    lastPanOffsetRef: RefObject<Point>;
    pastedImagesRef: RefObject<PastedImage[]>;
    selectedImageIdRef: RefObject<string | null>;
    activeResizeHandleRef: RefObject<ResizeHandle>;
    imageDragOffsetRef: RefObject<Point | null>;
}

export const handlePointerDown = ({
    e,
    lastPanOffsetRef,
    pastedImagesRef,
    selectedImageIdRef,
    activeResizeHandleRef,
    imageDragOffsetRef,
}: HandlePointerDownProps) => {
    const worldPoint = getWorldPoint({ e, lastPanOffsetRef });
    const images = pastedImagesRef.current;
    const img = getImageAtPoint(images, worldPoint);

    if (img) {
        selectedImageIdRef.current = img.id;

        const handle = getResizeHandleAtPoint(img, worldPoint);
        if (handle) {
            activeResizeHandleRef.current = handle;
            return;
        }

        imageDragOffsetRef.current = {
            x: worldPoint.x - img.x,
            y: worldPoint.y - img.y,
        };
    } else {
        selectedImageIdRef.current = null;
    }
};

interface HandlePointerMoveProps {
    e: React.MouseEvent;
    lastPanOffsetRef: RefObject<Point>;
    pastedImagesRef: RefObject<PastedImage[]>;
    selectedImageIdRef: RefObject<string | null>;
    activeResizeHandleRef: RefObject<ResizeHandle>;
    imageDragOffsetRef: RefObject<Point | null>;
}

export const handlePointerMove = ({
    e,
    lastPanOffsetRef,
    pastedImagesRef,
    selectedImageIdRef,
    activeResizeHandleRef,
    imageDragOffsetRef,
}: HandlePointerMoveProps) => {
    const worldPoint = getWorldPoint({ e, lastPanOffsetRef });
    const images = pastedImagesRef.current;
    const selectedId = selectedImageIdRef.current;
    if (!selectedId) return;

    const img = images.find((i) => i.id === selectedId);
    if (!img) return;

    // resizing
    if (activeResizeHandleRef.current) {
        const MIN_SIZE = 20;

        const right = img.x + img.width;
        const bottom = img.y + img.height;

        const aspectRatio = img.width / img.height;

        switch (activeResizeHandleRef.current) {
            case "se": {
                let newWidth = worldPoint.x - img.x;
                newWidth = Math.max(MIN_SIZE, newWidth);

                img.width = newWidth;
                img.height = newWidth / aspectRatio;
                break;
            }

            case "sw": {
                let newWidth = right - worldPoint.x;
                newWidth = Math.max(MIN_SIZE, newWidth);

                img.width = newWidth;
                img.height = newWidth / aspectRatio;

                img.x = right - img.width;
                break;
            }

            case "ne": {
                let newWidth = worldPoint.x - img.x;
                newWidth = Math.max(MIN_SIZE, newWidth);

                img.width = newWidth;
                img.height = newWidth / aspectRatio;

                img.y = bottom - img.height;
                break;
            }

            case "nw": {
                let newWidth = right - worldPoint.x;
                newWidth = Math.max(MIN_SIZE, newWidth);

                img.width = newWidth;
                img.height = newWidth / aspectRatio;

                img.x = right - img.width;
                img.y = bottom - img.height;
                break;
            }
        }
    }

    // dragging
    else if (imageDragOffsetRef.current) {
        img.x = worldPoint.x - imageDragOffsetRef.current.x;
        img.y = worldPoint.y - imageDragOffsetRef.current.y;
    }
};

interface HandlePointerUpProps {
    selectedImageIdRef: RefObject<string | null>;
    pastedImagesRef: RefObject<PastedImage[]>;
    onImageMoved: (id: string, changes: Partial<PastedImageMeta>) => void;
}

export const handlePointerUp = ({
    selectedImageIdRef,
    pastedImagesRef,
    onImageMoved,
}: HandlePointerUpProps) => {
    const id = selectedImageIdRef.current;
    if (id) {
        const img = pastedImagesRef.current.find((i) => i.id === id);
        if (img) {
            onImageMoved(id, {
                x: img.x,
                y: img.y,
                width: img.width,
                height: img.height,
            });
        }
    }
};
