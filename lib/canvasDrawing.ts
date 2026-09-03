import { PastedImage } from "@/types/imageTypes";
import { Point, Stroke } from "@/types/strokeTypes";
import {
    HIGHLIGHT_LINE_WIDTH,
    normaliseRect,
    PEN_LINE_WIDTH,
    Rect,
    selectedItemBounds,
    unionRects,
} from "@/lib/genometry";
import { SELECTION_COLOURS } from "@/lib/colours";
import { RemoteSelection } from "@/types/presenceTypes";
import { RefObject } from "react";

const HANDLE_SIZE = 10;
const DASH = [6, 4];
const NO_OFFSET: Point = { x: 0, y: 0 };

const REMOTE_SELECTION_LINE_WIDTH = 2;
const REMOTE_SELECTION_RADIUS = 8;

const drawSelectionBox = (
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    zoom: number,
    dashed: boolean,
) => {
    ctx.save();
    ctx.strokeStyle = SELECTION_COLOURS.border;
    ctx.lineWidth = 1 / zoom;
    if (dashed) ctx.setLineDash(DASH.map((d) => d / zoom));
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
};

const drawRemoteSelection = (
    ctx: CanvasRenderingContext2D,
    { colour, bounds }: RemoteSelection,
    zoom: number,
) => {
    ctx.save();
    ctx.strokeStyle = colour;
    ctx.lineWidth = REMOTE_SELECTION_LINE_WIDTH / zoom;
    ctx.beginPath();
    ctx.roundRect(
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        REMOTE_SELECTION_RADIUS / zoom,
    );
    ctx.stroke();
    ctx.restore();
};

const drawResizeHandles = (
    ctx: CanvasRenderingContext2D,
    image: PastedImage,
    zoom: number,
) => {
    const corners = [
        { x: image.x, y: image.y },
        { x: image.x + image.width, y: image.y },
        { x: image.x, y: image.y + image.height },
        { x: image.x + image.width, y: image.y + image.height },
    ];

    const size = HANDLE_SIZE / zoom;

    ctx.save();
    ctx.fillStyle = SELECTION_COLOURS.border;
    corners.forEach((corner) => {
        ctx.fillRect(corner.x - size / 2, corner.y - size / 2, size, size);
    });
    ctx.restore();
};

const hasNoExtent = (pts: Point[]) =>
    pts.every((p) => p.x === pts[0].x && p.y === pts[0].y);

const tracePath = (
    ctx: CanvasRenderingContext2D,
    pts: Point[],
    dx: number,
    dy: number,
) => {
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
};

const drawStroke = (
    ctx: CanvasRenderingContext2D,
    stroke: Stroke,
    dx: number,
    dy: number,
    lineWidth: number,
) => {
    const pts = stroke.points;
    if (pts.length === 0) return;

    if (hasNoExtent(pts)) {
        ctx.beginPath();
        ctx.fillStyle = stroke.colour;
        ctx.arc(pts[0].x + dx, pts[0].y + dy, lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
        return;
    }

    ctx.beginPath();
    ctx.strokeStyle = stroke.colour;
    tracePath(ctx, pts, dx, dy);
    ctx.stroke();
};

type DrawToCanvasParameters = {
    strokes: readonly Stroke[];
    currentStroke: Stroke | null;
    pastedImages: PastedImage[];
    canvasRef: RefObject<HTMLCanvasElement | null>;
    panOffset: Point;
    zoom: number;
    selectedImageId: string | null;
    marqueeRect?: Rect | null;
    selectedStrokeIds?: string[];
    selectedImageIds?: string[];
    selectorDelta?: Point;
    remoteSelections?: RemoteSelection[];
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
    marqueeRect,
    selectedStrokeIds,
    selectedImageIds,
    selectorDelta,
    remoteSelections,
    highlightCanvasRef,
}: DrawToCanvasParameters) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const { clientWidth, clientHeight } = canvas;

    if (
        canvas.width !== clientWidth * devicePixelRatio ||
        canvas.height !== clientHeight * devicePixelRatio
    ) {
        canvas.width = clientWidth * devicePixelRatio;
        canvas.height = clientHeight * devicePixelRatio;
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

    const draggedIds = new Set(selectedStrokeIds);
    const strokeOffset = (stroke: Stroke): Point =>
        draggedIds.has(stroke.id) ? (selectorDelta ?? NO_OFFSET) : NO_OFFSET;

    pastedImages?.forEach((image) => {
        // images arrive already inverted where needed — see hooks/useImagePaste
        ctx.drawImage(
            image.element,
            image.x,
            image.y,
            image.width,
            image.height,
        );
    });

    ctx.lineWidth = PEN_LINE_WIDTH;
    for (const stroke of penStrokes) {
        const { x: dx, y: dy } = strokeOffset(stroke);
        drawStroke(ctx, stroke, dx, dy, PEN_LINE_WIDTH);
    }

    // Composited offscreen so overlapping highlights don't compound.
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
        hlCtx.lineWidth = HIGHLIGHT_LINE_WIDTH;

        for (const stroke of highlightStrokes) {
            const { x: dx, y: dy } = strokeOffset(stroke);
            drawStroke(hlCtx, stroke, dx, dy, HIGHLIGHT_LINE_WIDTH);
        }

        ctx.save();
        ctx.resetTransform();
        ctx.globalAlpha = 0.25;
        ctx.drawImage(hl, 0, 0);
        ctx.restore();
    }

    const itemBounds = selectedItemBounds(
        allStrokes,
        pastedImages ?? [],
        selectedStrokeIds ?? [],
        selectedImageIds ?? [],
        selectorDelta,
    );

    for (const box of itemBounds) drawSelectionBox(ctx, box, zoom, false);

    if (itemBounds.length > 1) {
        const bounds = unionRects(itemBounds);
        if (bounds) drawSelectionBox(ctx, bounds, zoom, true);
    }

    const clickedImage = pastedImages?.find(
        (img) => img.id === selectedImageId,
    );
    if (clickedImage) {
        drawSelectionBox(ctx, clickedImage, zoom, false);
        drawResizeHandles(ctx, clickedImage, zoom);
    }

    if (marqueeRect) {
        drawSelectionBox(ctx, normaliseRect(marqueeRect), zoom, true);
    }

    // Last, so someone else's claim is never hidden under local chrome.
    for (const selection of remoteSelections ?? []) {
        drawRemoteSelection(ctx, selection, zoom);
    }
};

export default drawToCanvas;
