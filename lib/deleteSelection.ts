import { CanvasState } from "@/types/canvasStateTypes";

interface DeleteSelectionProps {
    state: CanvasState;
    eraseStrokes: (ids: string[]) => void;
    removeImageMeta: (id: string) => void;
}

export const deleteSelection = ({
    state,
    eraseStrokes,
    removeImageMeta,
}: DeleteSelectionProps) => {
    const hadSelectorSelection =
        state.selectedStrokeIds.length > 0 || state.selectedImageIds.length > 0;

    if (state.selectedStrokeIds.length > 0) {
        eraseStrokes([...state.selectedStrokeIds]);
        state.selectedStrokeIds = [];
    }

    // Meta only — the blob is left for the cleanup cron so undo can restore the
    // image.
    const selectorImageIds = [...state.selectedImageIds];
    if (selectorImageIds.length > 0) {
        for (const id of selectorImageIds) {
            removeImageMeta(id);
        }
        state.pastedImages = state.pastedImages.filter(
            (img) => !selectorImageIds.includes(img.id),
        );
        state.selectedImageIds = [];
    }

    if (hadSelectorSelection) {
        state.selectionBounds = null;
    }

    const id = state.selectedImageId;
    if (id && !selectorImageIds.includes(id)) {
        removeImageMeta(id);
        state.pastedImages = state.pastedImages.filter((img) => img.id != id);
        state.selectedImageId = null;
    }
};
