import { PastedImage } from "@/types/imageTypes";
import { Point, Stroke } from "@/types/strokeTypes";
import { normaliseRect, Rect } from "@/lib/genometry";
import { SELECTION_COLOURS } from "@/lib/colours";
import { RefObject } from "react";

// Selection chrome for an image: a light wash over it plus a hairline outline,
// so it reads as picked up rather than recoloured. Fill first, then stroke, so
// the outline isn't laid under its own wash.
const drawImageSelection = (
    ctx: CanvasRenderingContext2D,
    image: PastedImage,
    withHandles: boolean,
) => {
    ctx.save();

    ctx.fillStyle = SELECTION_COLOURS.fill;
    ctx.fillRect(image.x, image.y, image.width, image.height);

    ctx.strokeStyle = SELECTION_COLOURS.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(image.x, image.y, image.width, image.height);

    if (withHandles) {
        const size = 8;
        const corners = [
            { x: image.x, y: image.y }, // nw
            { x: image.x + image.width, y: image.y }, // ne
            { x: image.x, y: image.y + image.height }, // sw
            { x: image.x + image.width, y: image.y + image.height }, // se
        ];

        ctx.fillStyle = SELECTION_COLOURS.border;
        corners.forEach((corner) => {
            ctx.beginPath();
            ctx.rect(corner.x - size / 2, corner.y - size / 2, size, size);
            ctx.fill();
            ctx.stroke();
        });
    }

    ctx.restore();
};

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
        // images arrive already inverted where needed — see hooks/useImagePaste
        ctx.drawImage(
            image.element,
            image.x,
            image.y,
            image.width,
            image.height,
        );

        if (image.id === selectedImageId) {
            // clicked directly — resizable, so it carries corner handles
            drawImageSelection(ctx, image, true);
        } else if (selectedImageIds?.includes(image.id)) {
            // swept up by a marquee — one of several, so no resize handles
            drawImageSelection(ctx, image, false);
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

    // Selected-stroke wash. Strokes have no area to fill, so the selection is
    // traced over each one wider than the stroke itself, leaving a soft halo.
    if (selectedStrokeIds && selectedStrokeIds.length > 0) {
        const dx = selectorDelta?.x ?? 0;
        const dy = selectorDelta?.y ?? 0;
        ctx.lineWidth = 8;
        ctx.strokeStyle = SELECTION_COLOURS.stroke;
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

    // Marquee overlay (drawn last, on top of everything)
    if (selectorRect) {
        const r = normaliseRect(selectorRect);
        ctx.save();
        ctx.fillStyle = SELECTION_COLOURS.fill;
        ctx.fillRect(r.x, r.y, r.width, r.height);
        ctx.strokeStyle = SELECTION_COLOURS.border;
        ctx.lineWidth = 1;
        ctx.strokeRect(r.x, r.y, r.width, r.height);
        ctx.restore();
    }
};

export default drawToCanvas;
