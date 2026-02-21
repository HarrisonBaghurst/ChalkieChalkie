import { Point, Stroke } from "@/types/strokeTypes";
import { simplifyRDP } from "./strokeOptimisation";
import { RefObject } from "react";
import { Tools } from "@/types/toolTypes";
import { StrokeIntersectPoints } from "./genometry";
import { PastedImage, ResizeHandle } from "@/types/imageTypes";
import { getImageAtPoint, getResizeHandleAtPoint } from "./imageUtils";

// --- type definitions ---

type handleMouseDownParameters = {
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
};

type handleMouseMoveParameters = {
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
};

type handleMouseUpParameters = {
    e: React.MouseEvent;
    isDrawingRef: RefObject<boolean>;
    currentStrokeRef: RefObject<Stroke | null>;
    panStartRef: RefObject<Point | null>;
    lastPanOffsetRef: RefObject<Point>;
    panOffsetRef: RefObject<Point>;
    currentToolRef: RefObject<Tools>;
    onStrokeFinished: (stroke: Stroke) => void;
    pastedImagesRef: RefObject<PastedImage[]>;
    selectedImageIdRef: RefObject<string | null>;
    imageDragOffsetRef: RefObject<Point | null>;
    activeResizeHandleRef: RefObject<ResizeHandle>;
};

// --- helpers ---

const getMousePos = (e: React.MouseEvent): Point => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};

// --- input handlers ---

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
}: handleMouseDownParameters) => {
    e.preventDefault();

    if (e.buttons === 1 && currentToolRef.current === "pen") {
        // left click: start drawing
        isDrawingRef.current = true;
        const { x, y } = getMousePos(e);
        currentStrokeRef.current = {
            id: crypto.randomUUID(),
            points: [
                {
                    x: x - lastPanOffsetRef.current.x,
                    y: y - lastPanOffsetRef.current.y,
                },
            ],
            colour: currentColourRef.current,
        };
    }

    if (e.buttons === 1 && currentToolRef.current === "pointer") {
        // left click select image
        const { x, y } = getMousePos(e);

        // find image at current cursor position
        const worldPoint = {
            x: x - lastPanOffsetRef.current.x,
            y: y - lastPanOffsetRef.current.y,
        };
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
    }

    if (e.buttons === 2) {
        // right click: start panning
        panStartRef.current = getMousePos(e);
    }
};

export const handleMouseMove = (() => {
    let lastTime = 0;
    const THROTTLE_MS = 16; // ~60 FPS
    const ERASER_RADIUS = 10;

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
    }: handleMouseMoveParameters) => {
        const now = performance.now();
        if (now - lastTime < THROTTLE_MS) return;
        lastTime = now;

        const { x, y } = getMousePos(e);
        const worldPoint = {
            x: x - lastPanOffsetRef.current.x,
            y: y - lastPanOffsetRef.current.y,
        };

        // drawing with pen
        if (
            currentToolRef.current === "pen" &&
            e.buttons === 1 &&
            isDrawingRef.current &&
            currentStrokeRef.current
        ) {
            currentStrokeRef.current.points.push(worldPoint);
            return;
        }

        // removing with eraser
        if (currentToolRef.current === "eraser" && e.buttons === 1 && strokes) {
            const hitStrokeIds = strokes
                .filter((strokes) =>
                    StrokeIntersectPoints(strokes, worldPoint, ERASER_RADIUS),
                )
                .map((stroke) => stroke.id);

            if (hitStrokeIds.length >= 1) {
                onErase(hitStrokeIds);
            }
            return;
        }

        // panning
        if (e.buttons === 2 && panStartRef.current) {
            panOffsetRef.current = {
                x: lastPanOffsetRef.current.x + (x - panStartRef.current.x),
                y: lastPanOffsetRef.current.y + (y - panStartRef.current.y),
            };
        }

        // dragging or resizing image
        if (e.buttons === 1 && currentToolRef.current === "pointer") {
            const { x, y } = getMousePos(e);

            const worldPoint = {
                x: x - lastPanOffsetRef.current.x,
                y: y - lastPanOffsetRef.current.y,
            };

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

                switch (activeResizeHandleRef.current) {
                    case "se": {
                        const newWidth = worldPoint.x - img.x;
                        const newHeight = worldPoint.y - img.y;

                        img.width = Math.max(MIN_SIZE, newWidth);
                        img.height = Math.max(MIN_SIZE, newHeight);
                        break;
                    }

                    case "sw": {
                        const newWidth = right - worldPoint.x;
                        const newHeight = worldPoint.y - img.y;

                        img.width = Math.max(MIN_SIZE, newWidth);
                        img.height = Math.max(MIN_SIZE, newHeight);

                        img.x = right - img.width; // move left edge
                        break;
                    }

                    case "ne": {
                        const newWidth = worldPoint.x - img.x;
                        const newHeight = bottom - worldPoint.y;

                        img.width = Math.max(MIN_SIZE, newWidth);
                        img.height = Math.max(MIN_SIZE, newHeight);

                        img.y = bottom - img.height; // move top edge
                        break;
                    }

                    case "nw": {
                        const newWidth = right - worldPoint.x;
                        const newHeight = bottom - worldPoint.y;

                        img.width = Math.max(MIN_SIZE, newWidth);
                        img.height = Math.max(MIN_SIZE, newHeight);

                        img.x = right - img.width;
                        img.y = bottom - img.height;
                        break;
                    }
                }

                return;
            }

            // dragging
            if (imageDragOffsetRef.current) {
                img.x = worldPoint.x - imageDragOffsetRef.current.x;
                img.y = worldPoint.y - imageDragOffsetRef.current.y;
            }
        }
    };
})();

export const handleMouseUp = ({
    e,
    isDrawingRef,
    currentStrokeRef,
    panStartRef,
    lastPanOffsetRef,
    panOffsetRef,
    currentToolRef,
    onStrokeFinished,
    pastedImagesRef,
    selectedImageIdRef,
    imageDragOffsetRef,
    activeResizeHandleRef,
}: handleMouseUpParameters) => {
    if (
        e.button === 0 &&
        isDrawingRef.current &&
        currentToolRef.current === "pen"
    ) {
        isDrawingRef.current = false;
        if (currentStrokeRef.current) {
            const simplified = simplifyRDP(currentStrokeRef.current.points, 1);
            const newStroke = {
                id: crypto.randomUUID(),
                points: simplified,
                colour: currentStrokeRef.current.colour,
            };
            onStrokeFinished(newStroke);
            currentStrokeRef.current = null;
        }
    } else if (e.button === 2) {
        panStartRef.current = null;
        lastPanOffsetRef.current = { ...panOffsetRef.current };
    }

    imageDragOffsetRef.current = null;
    activeResizeHandleRef.current = null;
};
