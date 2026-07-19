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
    zoom: number;
    selectedImageId: string | null;
    selectorRect?: Rect | null;
    selectedStrokeIds?: string[];
    selectedImageIds?: string[];
    selectorDelta?: Point;
    highlightCanvasRef?: RefObject<HTMLCanvasElement | null>;
};

const drawToCanvas = ({
    strokes,
    currentStroke,
    pastedImages,
    canvasRef,
    panOffset,
    zoom,
    selectedImageId,
    selectorRect,
    selectedStrokeIds,
    selectedImageIds,
    selectorDelta,
    highlightCanvasRef,
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

    // clear in identity space first so we wipe every device pixel
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // world → device pixel: screen = world * zoom + panOffset; then * dpr for hi-DPI
    ctx.setTransform(
        devicePixelRatio * zoom,
        0,
        0,
        devicePixelRatio * zoom,
        devicePixelRatio * panOffset.x,
        devicePixelRatio * panOffset.y,
    );

    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;
    const penStrokes = allStrokes.filter((s) => !s.highlight);
    const highlightStrokes = allStrokes.filter((s) => s.highlight);

    // Draw images (world coordinates)
    pastedImages?.forEach((image) => {
        if (image.inverted) {
            ctx.save();
            ctx.filter = "invert(1)";
            ctx.drawImage(
                image.element,
                image.x,
                image.y,
                image.width,
                image.height,
            );
            ctx.restore();
        } else {
            ctx.drawImage(
                image.element,
                image.x,
                image.y,
                image.width,
                image.height,
            );
        }

        if (image.id === selectedImageId) {
            // border + resize handles (pointer tool single-selection)
            ctx.strokeStyle = "#3a86ff";
            ctx.lineWidth = 1;
            ctx.strokeRect(image.x, image.y, image.width, image.height);

            const size = 8;
            const corners = [
                { x: image.x, y: image.y }, // nw
                { x: image.x + image.width, y: image.y }, // ne
                { x: image.x, y: image.y + image.height }, // sw
                { x: image.x + image.width, y: image.y + image.height }, // se
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
            ctx.strokeRect(image.x, image.y, image.width, image.height);
        }
    });

    // render pen strokes
    ctx.lineWidth = 3;
    for (const stroke of penStrokes) {
        if (stroke.points.length < 2) continue;
        ctx.beginPath();
        ctx.strokeStyle = stroke.colour;
        const pts = stroke.points;
        ctx.moveTo(pts[0].x, pts[0].y);

        for (let i = 1; i < pts.length - 2; i++) {
            const xc = (pts[i].x + pts[i + 1].x) / 2;
            const yc = (pts[i].y + pts[i + 1].y) / 2;
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
        }

        const last = pts.length - 1;
        ctx.quadraticCurveTo(
            pts[last - 1].x,
            pts[last - 1].y,
            pts[last].x,
            pts[last].y,
        );
        ctx.stroke();
    }

    // Highlight strokes — composited at 35% opacity via offscreen canvas so overlaps don't compound
    if (highlightStrokes.length > 0 && highlightCanvasRef?.current) {
        const hl = highlightCanvasRef.current;

        if (hl.width !== canvas.width || hl.height !== canvas.height) {
            hl.width = canvas.width;
            hl.height = canvas.height;
        }

        const hlCtx = hl.getContext("2d")!;
        hlCtx.setTransform(1, 0, 0, 1, 0, 0);
        hlCtx.clearRect(0, 0, hl.width, hl.height);
        hlCtx.setTransform(
            devicePixelRatio * zoom,
            0,
            0,
            devicePixelRatio * zoom,
            devicePixelRatio * panOffset.x,
            devicePixelRatio * panOffset.y,
        );
        hlCtx.lineJoin = "round";
        hlCtx.lineCap = "round";
        hlCtx.lineWidth = 48;

        for (const stroke of highlightStrokes) {
            if (stroke.points.length < 2) continue;
            hlCtx.beginPath();
            hlCtx.strokeStyle = stroke.colour;
            const pts = stroke.points;
            hlCtx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length - 2; i++) {
                const xc = (pts[i].x + pts[i + 1].x) / 2;
                const yc = (pts[i].y + pts[i + 1].y) / 2;
                hlCtx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
            }
            const last = pts.length - 1;
            hlCtx.quadraticCurveTo(
                pts[last - 1].x,
                pts[last - 1].y,
                pts[last].x,
                pts[last].y,
            );
            hlCtx.stroke();
        }

        ctx.save();
        ctx.resetTransform();
        ctx.globalAlpha = 0.25;
        ctx.drawImage(hl, 0, 0);
        ctx.restore();
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
            ctx.moveTo(pts[0].x + dx, pts[0].y + dy);
            for (let i = 1; i < pts.length - 2; i++) {
                const xc = (pts[i].x + pts[i + 1].x) / 2 + dx;
                const yc = (pts[i].y + pts[i + 1].y) / 2 + dy;
                ctx.quadraticCurveTo(pts[i].x + dx, pts[i].y + dy, xc, yc);
            }
            const last = pts.length - 1;
            ctx.quadraticCurveTo(
                pts[last - 1].x + dx,
                pts[last - 1].y + dy,
                pts[last].x + dx,
                pts[last].y + dy,
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
        ctx.strokeRect(r.x, r.y, r.width, r.height);
        ctx.fillStyle = "rgba(58, 134, 255, 0.07)";
        ctx.fillRect(r.x, r.y, r.width, r.height);
        ctx.restore();
    }
};

export default drawToCanvas;
