import drawToCanvas from "@/lib/canvasDrawing";
import { CanvasState } from "@/types/canvasStateTypes";
import { Stroke } from "@/types/strokeTypes";
import { RefObject, useEffect, useRef } from "react";

const DOTTED_PAPER_BASE = 40;
const DOTTED_PAPER_DOT_RADIUS = 1.5;
const DOTTED_PAPER_COLOR = "#272724";

interface useCanvasRenderLoopProps {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    canvasStateRef: RefObject<CanvasState>;
    strokes: readonly Stroke[] | null;
}

// runs requestAnimationFrame render loop and syncs background to pan offset + zoom
export const useCanvasRenderLoop = ({
    canvasRef,
    canvasStateRef,
    strokes,
}: useCanvasRenderLoopProps) => {
    const highlightCanvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        highlightCanvasRef.current = document.createElement("canvas");
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        let cancelled = false;

        const render = () => {
            if (cancelled) return;

            const state = canvasStateRef.current;
            const { offset, zoom } = state.viewport;

            drawToCanvas({
                strokes: strokes || [],
                currentStroke: state.currentStroke,
                pastedImages: state.pastedImages,
                canvasRef,
                panOffset: offset,
                zoom,
                selectedImageId: state.selectedImageId,
                selectorRect: state.selectorRect,
                selectedStrokeIds: state.selectedStrokeIds,
                selectedImageIds: state.selectedImageIds,
                selectorDelta: state.selectorDelta,
                highlightCanvasRef,
            });

            if (canvasRef.current) {
                const size = DOTTED_PAPER_BASE * zoom;
                const dot = DOTTED_PAPER_DOT_RADIUS * zoom;
                canvas.style.backgroundPosition = `${offset.x}px ${offset.y}px`;
                canvas.style.backgroundSize = `${size}px ${size}px`;
                canvas.style.backgroundImage = `radial-gradient(${DOTTED_PAPER_COLOR} ${dot}px, transparent ${dot}px)`;
            }

            requestAnimationFrame(render);
        };

        requestAnimationFrame(render);
        return () => {
            cancelled = true;
        };
    }, [strokes]);
};
