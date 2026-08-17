import { useUpdateMyPresence } from "@liveblocks/react";
import { RefObject, useEffect, useRef } from "react";
import { CanvasState } from "@/types/canvasStateTypes";
import { SelectionPresence } from "@/types/presenceTypes";
import { selectedItemBounds, unionRects } from "@/lib/genometry";
import { Stroke } from "@/types/strokeTypes";
import { PastedImageMeta } from "@/types/imageTypes";

interface UseSelectionPresenceProps {
    canvasStateRef: RefObject<CanvasState>;
    strokes: readonly Stroke[] | null;
    pastedImagesMeta: readonly PastedImageMeta[] | null;
}

const buildSelection = (
    state: CanvasState,
    strokes: readonly Stroke[],
    images: readonly PastedImageMeta[],
): SelectionPresence | null => {
    const imageIds = [...state.selectedImageIds];
    if (state.selectedImageId && !imageIds.includes(state.selectedImageId)) {
        imageIds.push(state.selectedImageId);
    }
    if (state.selectedStrokeIds.length === 0 && imageIds.length === 0) {
        return null;
    }

    const bounds = unionRects(
        selectedItemBounds(strokes, images, state.selectedStrokeIds, imageIds),
    );
    if (!bounds) return null;

    return { strokeIds: [...state.selectedStrokeIds], imageIds, bounds };
};

const signature = (selection: SelectionPresence | null): string => {
    if (!selection) return "";
    const { x, y, width, height } = selection.bounds;
    return [
        selection.strokeIds.join(","),
        selection.imageIds.join(","),
        Math.round(x),
        Math.round(y),
        Math.round(width),
        Math.round(height),
    ].join("|");
};

export const useSelectionPresence = ({
    canvasStateRef,
    strokes,
    pastedImagesMeta,
}: UseSelectionPresenceProps) => {
    const updateMyPresence = useUpdateMyPresence();
    const storageRef = useRef({ strokes, pastedImagesMeta });
    useEffect(() => {
        storageRef.current = { strokes, pastedImagesMeta };
    }, [strokes, pastedImagesMeta]);

    useEffect(() => {
        let cancelled = false;
        let lastSignature = "";

        const poll = () => {
            if (cancelled) return;
            requestAnimationFrame(poll);

            const selection = buildSelection(
                canvasStateRef.current,
                storageRef.current.strokes ?? [],
                storageRef.current.pastedImagesMeta ?? [],
            );
            const next = signature(selection);
            if (next === lastSignature) return;
            lastSignature = next;
            updateMyPresence({ selection });
        };

        requestAnimationFrame(poll);
        return () => {
            cancelled = true;
            updateMyPresence({ selection: null });
        };
    }, [canvasStateRef, updateMyPresence]);
};
