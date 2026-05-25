import { PastedImage } from "@/types/imageTypes";
import { Point, Stroke } from "@/types/strokeTypes";
import { normaliseRect, Rect } from "@/lib/genometry";
import { RefObject } from "react";

type DrawToCanvasParameters = {
    strokes: readonly Stroke[];
    currentStroke: Stroke | null;
    pastedImages: PastedImage[];
    canvasRef: RefObject<HTMLCanvasElement | null>;
    panOffset: Point;
    selectedImageId: string | null;
    selectorRect?: Rect | null;
    selectedStrokeIds?: string[];
    selectedImageIds?: string[];
    selectorDelta?: Point;
};

const drawToCanvas = ({
    strokes,
    currentStroke,
    pastedImages,
    canvasRef,
    panOffset,
    selectedImageId,
    selectorRect,
    selectedStrokeIds,
    selectedImageIds,
    selectorDelta,
}: DrawToCanvasParameters) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // match display resolution
    const devicePixelRatio = window.devicePixelRatio || 1;
    const { clientWidth, clientHeight } = canvas;

    // only resize if neccessary
    if (
        canvas.width !== clientWidth * devicePixelRatio ||
        canvas.height !== clientHeight * devicePixelRatio
    ) {
        canvas.width = clientWidth * devicePixelRatio;
        canvas.height = clientHeight * devicePixelRatio;
        canvas.style.width = `${clientWidth}px`;
        canvas.style.height = `${clientHeight}px`;
    }
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    // cear & setup
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;

    // Draw images
    pastedImages?.forEach((image) => {
        if (image.inverted) {
            ctx.save();
            ctx.filter = "invert(1)";
            ctx.drawImage(
                image.element,
                image.x + panOffset.x,
                image.y + panOffset.y,
                image.width,
                image.height,
            );
            ctx.restore();
        } else {
            ctx.drawImage(
                image.element,
                image.x + panOffset.x,
                image.y + panOffset.y,
                image.width,
                image.height,
            );
        }

        const screenX = image.x + panOffset.x;
        const screenY = image.y + panOffset.y;

        if (image.id === selectedImageId) {
            // border + resize handles (pointer tool single-selection)
            ctx.strokeStyle = "#3a86ff";
            ctx.lineWidth = 1;
            ctx.strokeRect(screenX, screenY, image.width, image.height);

            const size = 8;
            const corners = [
                { x: screenX, y: screenY }, // nw
                { x: screenX + image.width, y: screenY }, // ne
                { x: screenX, y: screenY + image.height }, // sw
                { x: screenX + image.width, y: screenY + image.height }, // se
            ];

            corners.forEach((corner) => {
                ctx.beginPath();
                ctx.rect(corner.x - size / 2, corner.y - size / 2, size, size);
                ctx.fill();
                ctx.stroke();
            });
        } else if (selectedImageIds?.includes(image.id)) {
            // border only — selector tool multi-selection (no resize handles)
            ctx.strokeStyle = "#3a86ff";
            ctx.lineWidth = 1;
            ctx.strokeRect(screenX, screenY, image.width, image.height);
        }
    });

    // render all strokes with panning offset
    ctx.lineWidth = 3;
    for (const stroke of allStrokes) {
        if (stroke.points.length < 2) continue;
        ctx.beginPath();
        ctx.strokeStyle = stroke.colour;
        const pts = stroke.points;
        ctx.moveTo(pts[0].x + panOffset.x, pts[0].y + panOffset.y);

        for (let i = 1; i < pts.length - 2; i++) {
            const xc = (pts[i].x + pts[i + 1].x) / 2 + panOffset.x;
            const yc = (pts[i].y + pts[i + 1].y) / 2 + panOffset.y;
            ctx.quadraticCurveTo(
                pts[i].x + panOffset.x,
                pts[i].y + panOffset.y,
                xc,
                yc,
            );
        }

        const last = pts.length - 1;
        ctx.quadraticCurveTo(
            pts[last - 1].x + panOffset.x,
            pts[last - 1].y + panOffset.y,
            pts[last].x + panOffset.x,
            pts[last].y + panOffset.y,
        );
        ctx.stroke();
    }

    // Selected-stroke highlight pass (selector tool)
    if (selectedStrokeIds && selectedStrokeIds.length > 0) {
        const dx = selectorDelta?.x ?? 0;
        const dy = selectorDelta?.y ?? 0;
        ctx.lineWidth = 6;
        ctx.strokeStyle = "rgba(58, 134, 255, 0.45)";
        for (const stroke of allStrokes) {
            if (!selectedStrokeIds.includes(stroke.id)) continue;
            if (stroke.points.length < 2) continue;
            ctx.beginPath();
            const pts = stroke.points;
            ctx.moveTo(pts[0].x + panOffset.x + dx, pts[0].y + panOffset.y + dy);
            for (let i = 1; i < pts.length - 2; i++) {
                const xc = (pts[i].x + pts[i + 1].x) / 2 + panOffset.x + dx;
                const yc = (pts[i].y + pts[i + 1].y) / 2 + panOffset.y + dy;
                ctx.quadraticCurveTo(
                    pts[i].x + panOffset.x + dx,
                    pts[i].y + panOffset.y + dy,
                    xc,
                    yc,
                );
            }
            const last = pts.length - 1;
            ctx.quadraticCurveTo(
                pts[last - 1].x + panOffset.x + dx,
                pts[last - 1].y + panOffset.y + dy,
                pts[last].x + panOffset.x + dx,
                pts[last].y + panOffset.y + dy,
            );
            ctx.stroke();
        }
    }

    // Selection rect overlay (drawn last, on top of everything)
    if (selectorRect) {
        const r = normaliseRect(selectorRect);
        ctx.save();
        ctx.strokeStyle = "#3a86ff";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(r.x + panOffset.x, r.y + panOffset.y, r.width, r.height);
        ctx.fillStyle = "rgba(58, 134, 255, 0.07)";
        ctx.fillRect(r.x + panOffset.x, r.y + panOffset.y, r.width, r.height);
        ctx.restore();
    }
};

export default drawToCanvas;
