import drawToCanvas from "@/lib/canvasDrawing";
import { PastedImage } from "@/types/imageTypes";
import { Point, Stroke } from "@/types/strokeTypes";
import { RefObject, useEffect } from "react";

interface useCanvasRenderLoopProps {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    strokes: readonly Stroke[] | null;
    currentStrokeRef: RefObject<Stroke | null>;
    pastedImagesRef: RefObject<PastedImage[]>;
    panOffsetRef: RefObject<Point>;
    selectedImageIdRef: RefObject<string | null>;
}

// runs requestAnimationFrame render loop and syncs background to pan offset
export const useCanvasRenderLoop = ({
    canvasRef,
    strokes,
    currentStrokeRef,
    pastedImagesRef,
    panOffsetRef,
    selectedImageIdRef,
}: useCanvasRenderLoopProps) => {
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const render = () => {
            drawToCanvas({
                strokes: strokes || [],
                currentStroke: currentStrokeRef.current,
                pastedImages: pastedImagesRef.current,
                canvasRef,
                panOffset: panOffsetRef.current,
                selectedImageId: selectedImageIdRef.current,
            });

            if (canvasRef.current) {
                const { x, y } = panOffsetRef.current;
                canvas.style.backgroundPosition = `${x}px ${y}px`;
            }

            requestAnimationFrame(render);
        };

        const frameId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(frameId);
    }, [strokes]);
};
