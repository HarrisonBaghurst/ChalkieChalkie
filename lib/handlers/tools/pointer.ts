import { ToolContext, ToolStrategy } from "@/types/canvasStateTypes";
import { getWorldPoint } from "../helpers";
import { getImageAtPoint, getResizeHandleAtPoint } from "@/lib/imageUtils";

const onDown = ({ e, state }: ToolContext) => {
    const worldPoint = getWorldPoint(e, state.viewport);
    const img = getImageAtPoint(state.pastedImages, worldPoint);

    if (img) {
        state.selectedImageId = img.id;

        const handle = getResizeHandleAtPoint(img, worldPoint);
        if (handle) {
            state.activeResizeHandle = handle;
            return;
        }

        state.imageDragOffset = {
            x: worldPoint.x - img.x,
            y: worldPoint.y - img.y,
        };
    } else {
        state.selectedImageId = null;
    }
};

const onMove = ({ e, state }: ToolContext) => {
    const worldPoint = getWorldPoint(e, state.viewport);
    const selectedId = state.selectedImageId;
    if (!selectedId) return;

    const img = state.pastedImages.find((i) => i.id === selectedId);
    if (!img) return;

    // resizing
    if (state.activeResizeHandle) {
        const MIN_SIZE = 20;

        const right = img.x + img.width;
        const bottom = img.y + img.height;

        const aspectRatio = img.width / img.height;

        switch (state.activeResizeHandle) {
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
    else if (state.imageDragOffset) {
        img.x = worldPoint.x - state.imageDragOffset.x;
        img.y = worldPoint.y - state.imageDragOffset.y;
    }
};

const onUp = ({ state, callbacks }: ToolContext) => {
    const id = state.selectedImageId;
    if (id) {
        const img = state.pastedImages.find((i) => i.id === id);
        if (img) {
            callbacks.onImageMoved(id, {
                x: img.x,
                y: img.y,
                width: img.width,
                height: img.height,
            });
        }
    }
};

export const pointerStrategy: ToolStrategy = { onDown, onMove, onUp };
