import { PastedImage } from "@/types/imageTypes";
import { Point, Stroke } from "@/types/strokeTypes";
import { RefObject } from "react";

type DrawToCanvasParameters = {
    strokes: readonly Stroke[];
    currentStroke: Stroke | null;
    pastedImages: PastedImage[];
    canvasRef: RefObject<HTMLCanvasElement | null>;
    panOffset: Point;
    selectedImageId: string | null;
};

const drawToCanvas = ({
    strokes,
    currentStroke,
    pastedImages,
    canvasRef,
    panOffset,
    selectedImageId,
}: DrawToCanvasParameters) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // match display size
    const { clientWidth, clientHeight } = canvas;
    if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
        canvas.width = clientWidth;
        canvas.height = clientHeight;
    }

    // cear & setup
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;

    // Draw images
    pastedImages?.forEach((image) => {
        ctx.drawImage(
            image.element,
            image.x + panOffset.x,
            image.y + panOffset.y,
            image.width,
            image.height,
        );

        if (image.id === selectedImageId) {
            // border around selected image
            const screenX = image.x + panOffset.x;
            const screenY = image.y + panOffset.y;

            ctx.strokeStyle = "#3a86ff";
            ctx.strokeRect(screenX, screenY, image.width, image.height);

            const size = 8;
            const corners = [
                { x: screenX, y: screenY }, // nw
                { x: screenX + image.width, y: screenY }, // ne
                { x: screenX, y: screenY + image.height }, // sw
                { x: screenX + image.width, y: screenY + image.height }, // se
            ];

            // handles
            corners.forEach((corner) => {
                ctx.beginPath();
                ctx.rect(corner.x - size / 2, corner.y - size / 2, size, size);
                ctx.fill();
                ctx.stroke();
            });
        }
    });

    // render all strokes with panning offset
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
};

export default drawToCanvas;
