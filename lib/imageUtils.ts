import { PastedImage, ResizeHandle, ResizeHandleKey } from "@/types/imageTypes";
import { Point } from "@/types/strokeTypes";

export const getImageAtPoint = (
    images: PastedImage[],
    point: Point,
): PastedImage | null => {
    for (let i = images.length - 1; i >= 0; i--) {
        const img = images[i];
        if (
            point.x >= img.x &&
            point.x <= img.x + img.width &&
            point.y >= img.y &&
            point.y <= img.y + img.height
        ) {
            return img;
        }
    }
    return null;
};

const HANDLE_SIZE = 20;

export const getResizeHandleAtPoint = (
    img: PastedImage,
    point: Point,
): ResizeHandle => {
    const handles = {
        nw: { x: img.x, y: img.y },
        ne: { x: img.x + img.width, y: img.y },
        sw: { x: img.x, y: img.y + img.height },
        se: { x: img.x + img.width, y: img.y + img.height },
    };

    for (const key in handles) {
        const handle = handles[key as ResizeHandleKey];

        const left = handle.x - HANDLE_SIZE / 2;
        const right = handle.x + HANDLE_SIZE / 2;
        const top = handle.y - HANDLE_SIZE / 2;
        const bottom = handle.y + HANDLE_SIZE / 2;

        if (
            point.x >= left &&
            point.x <= right &&
            point.y >= top &&
            point.y <= bottom
        ) {
            return key as ResizeHandle;
        }
    }

    return null;
};
