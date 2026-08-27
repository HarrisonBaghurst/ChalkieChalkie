import { RefObject, useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import { CanvasState } from "@/types/canvasStateTypes";
import { Stroke } from "@/types/strokeTypes";
import { selectedItemBounds, unionRects } from "@/lib/genometry";
import { deleteSelection } from "@/lib/deleteSelection";

const GAP = 12;
const EDGE_MARGIN = 8;
const BUTTON_SIZE = 44;

interface SelectionActionsProps {
    canvasStateRef: RefObject<CanvasState>;
    strokes: readonly Stroke[] | null;
    eraseStrokes: (ids: string[]) => void;
    removeImageMeta: (id: string) => void;
}

const SelectionActions = ({
    canvasStateRef,
    strokes,
    eraseStrokes,
    removeImageMeta,
}: SelectionActionsProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const strokesRef = useRef(strokes);
    useEffect(() => {
        strokesRef.current = strokes;
    }, [strokes]);

    // Positioned from the same recomputation drawToCanvas uses, not from
    // state.selectionBounds — that is null for a directly clicked image and
    // stale after a resize — so the button tracks the drawn box exactly.
    useEffect(() => {
        let cancelled = false;

        const update = () => {
            if (cancelled) return;
            requestAnimationFrame(update);

            const el = containerRef.current;
            if (!el) return;

            const state = canvasStateRef.current;
            // Hidden mid-gesture, so it is never sitting under the finger that
            // is doing the dragging.
            const gesturing = Boolean(
                state.selectorDragStart ||
                state.marqueeRect ||
                state.activeResizeHandle ||
                state.imageDragOffset,
            );

            const imageIds = [...state.selectedImageIds];
            if (
                state.selectedImageId &&
                !imageIds.includes(state.selectedImageId)
            ) {
                imageIds.push(state.selectedImageId);
            }

            const hasSelection =
                state.selectedStrokeIds.length > 0 || imageIds.length > 0;

            const bounds =
                gesturing || !hasSelection
                    ? null
                    : unionRects(
                          selectedItemBounds(
                              strokesRef.current ?? [],
                              state.pastedImages,
                              state.selectedStrokeIds,
                              imageIds,
                              state.selectorDelta,
                          ),
                      );

            if (!bounds) {
                if (el.style.display !== "none") el.style.display = "none";
                return;
            }

            const { offset, zoom } = state.viewport;
            const { width, height } = state.canvasRect;
            const half = BUTTON_SIZE / 2;

            const x = Math.min(
                Math.max(
                    (bounds.x + bounds.width / 2) * zoom + offset.x,
                    half + EDGE_MARGIN,
                ),
                width - half - EDGE_MARGIN,
            );
            const y = Math.min(
                (bounds.y + bounds.height) * zoom + offset.y + GAP,
                height - BUTTON_SIZE - EDGE_MARGIN,
            );

            el.style.display = "block";
            el.style.transform = `translate(${x}px, ${y}px) translateX(-50%)`;
        };

        requestAnimationFrame(update);
        return () => {
            cancelled = true;
        };
    }, [canvasStateRef]);

    return (
        <div
            ref={containerRef}
            style={{
                position: "absolute",
                left: 0,
                top: 0,
                display: "none",
                willChange: "transform",
            }}
            className="z-40"
        >
            <button
                aria-label="Delete selection"
                onClick={() =>
                    deleteSelection({
                        state: canvasStateRef.current,
                        eraseStrokes,
                        removeImageMeta,
                    })
                }
                className="flex size-11 cursor-pointer items-center justify-center radius-control border border-foreground-third/15 bg-card-background text-destructive transition-colors duration-150 hover:bg-destructive/10"
            >
                <Trash2 className="size-5" />
            </button>
        </div>
    );
};

export default SelectionActions;
