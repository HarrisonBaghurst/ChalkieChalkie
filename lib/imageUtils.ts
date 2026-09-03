import { PastedImage, ResizeHandle, ResizeHandleKey } from "@/types/imageTypes";
import { Point } from "@/types/strokeTypes";

const HANDLE_SIZE = 28;

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

export const getResizeHandleAtPoint = (
    img: PastedImage,
    point: Point,
    zoom: number,
): ResizeHandle => {
    const handles = {
        nw: { x: img.x, y: img.y },
        ne: { x: img.x + img.width, y: img.y },
        sw: { x: img.x, y: img.y + img.height },
        se: { x: img.x + img.width, y: img.y + img.height },
    };

    const half = HANDLE_SIZE / zoom / 2;

    for (const key in handles) {
        const handle = handles[key as ResizeHandleKey];

        if (
            point.x >= handle.x - half &&
            point.x <= handle.x + half &&
            point.y >= handle.y - half &&
            point.y <= handle.y + half
        ) {
            return key as ResizeHandle;
        }
    }

    return null;
};
