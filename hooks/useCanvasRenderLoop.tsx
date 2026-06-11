import drawToCanvas from "@/lib/canvasDrawing";
import { PastedImage } from "@/types/imageTypes";
import { Rect } from "@/lib/genometry";
import { Point, Stroke } from "@/types/strokeTypes";
import { RefObject, useEffect, useRef } from "react";

const DOTTED_PAPER_BASE = 40;
const DOTTED_PAPER_DOT_RADIUS = 1.5;
const DOTTED_PAPER_COLOR = "#272724";

interface useCanvasRenderLoopProps {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    strokes: readonly Stroke[] | null;
    currentStrokeRef: RefObject<Stroke | null>;
    pastedImagesRef: RefObject<PastedImage[]>;
    panOffsetRef: RefObject<Point>;
    zoomRef: RefObject<number>;
    selectedImageIdRef: RefObject<string | null>;
    selectorRectRef: RefObject<Rect | null>;
    selectedStrokeIdsRef: RefObject<string[]>;
    selectedImageIdsRef: RefObject<string[]>;
    selectorDeltaRef: RefObject<Point>;
}

// runs requestAnimationFrame render loop and syncs background to pan offset + zoom
export const useCanvasRenderLoop = ({
    canvasRef,
    strokes,
    currentStrokeRef,
    pastedImagesRef,
    panOffsetRef,
    zoomRef,
    selectedImageIdRef,
    selectorRectRef,
    selectedStrokeIdsRef,
    selectedImageIdsRef,
    selectorDeltaRef,
}: useCanvasRenderLoopProps) => {
    const highlightCanvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        highlightCanvasRef.current = document.createElement("canvas");
    }, []);

    // TODO: leak — this effect re-runs on every `strokes` change but cleanup
    // only cancels the initial frame id; the self-requeuing loop keeps
    // running, so N stroke updates leave N+1 concurrent rAF loops. Track the
    // latest frame id each frame (or use a cancelled flag) so cleanup actually
    // stops the loop.
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
                zoom: zoomRef.current,
                selectedImageId: selectedImageIdRef.current,
                selectorRect: selectorRectRef.current,
                selectedStrokeIds: selectedStrokeIdsRef.current,
                selectedImageIds: selectedImageIdsRef.current,
                selectorDelta: selectorDeltaRef.current,
                highlightCanvasRef,
            });

            if (canvasRef.current) {
                const { x, y } = panOffsetRef.current;
                const z = zoomRef.current;
                const size = DOTTED_PAPER_BASE * z;
                const dot = DOTTED_PAPER_DOT_RADIUS * z;
                canvas.style.backgroundPosition = `${x}px ${y}px`;
                canvas.style.backgroundSize = `${size}px ${size}px`;
                canvas.style.backgroundImage = `radial-gradient(${DOTTED_PAPER_COLOR} ${dot}px, transparent ${dot}px)`;
            }

            requestAnimationFrame(render);
        };

        const frameId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(frameId);
    }, [strokes]);
};
