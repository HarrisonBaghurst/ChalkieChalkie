import drawToCanvas from "@/lib/canvasDrawing";
import { PastedImage } from "@/types/imageTypes";
import { Rect } from "@/lib/genometry";
import { Point, Stroke } from "@/types/strokeTypes";
import { RefObject, useEffect } from "react";

interface useCanvasRenderLoopProps {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    strokes: readonly Stroke[] | null;
    currentStrokeRef: RefObject<Stroke | null>;
    pastedImagesRef: RefObject<PastedImage[]>;
    panOffsetRef: RefObject<Point>;
    selectedImageIdRef: RefObject<string | null>;
    selectorRectRef: RefObject<Rect | null>;
    selectedStrokeIdsRef: RefObject<string[]>;
    selectedImageIdsRef: RefObject<string[]>;
    selectorDeltaRef: RefObject<Point>;
}

// runs requestAnimationFrame render loop and syncs background to pan offset
export const useCanvasRenderLoop = ({
    canvasRef,
    strokes,
    currentStrokeRef,
    pastedImagesRef,
    panOffsetRef,
    selectedImageIdRef,
    selectorRectRef,
    selectedStrokeIdsRef,
    selectedImageIdsRef,
    selectorDeltaRef,
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
                selectorRect: selectorRectRef.current,
                selectedStrokeIds: selectedStrokeIdsRef.current,
                selectedImageIds: selectedImageIdsRef.current,
                selectorDelta: selectorDeltaRef.current,
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
