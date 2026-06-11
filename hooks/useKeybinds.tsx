import { CanvasState } from "@/types/canvasStateTypes";
import { RefObject, useEffect } from "react";

interface UseKeybindsProps {
    canvasStateRef: RefObject<CanvasState>;
    removeImageMeta: (id: string) => void;
    undo: () => void;
    redo: () => void;
    eraseStrokes: (ids: string[]) => void;
}

export const useKeybinds = ({
    canvasStateRef,
    removeImageMeta,
    undo,
    redo,
    eraseStrokes,
}: UseKeybindsProps) => {
    useEffect(() => {
        const onKeypress = (event: KeyboardEvent) => {
            // Ignore keybinds while typing in a text field (e.g. the
            // WorkspaceTopbar title input) so Backspace/Ctrl+Z don't leak
            // into canvas selections and history.
            const target = event.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.isContentEditable)
            ) {
                return;
            }

            const state = canvasStateRef.current;
            if (event.ctrlKey && event.key === "z") {
                event.preventDefault();
                undo();
            } else if (event.ctrlKey && event.key === "y") {
                event.preventDefault();
                redo();
            } else if (event.key === "Delete" || event.key === "Backspace") {
                // Delete selector-selected strokes
                const hadSelectorSelection =
                    state.selectedStrokeIds.length > 0 ||
                    state.selectedImageIds.length > 0;

                if (state.selectedStrokeIds.length > 0) {
                    eraseStrokes([...state.selectedStrokeIds]);
                    state.selectedStrokeIds = [];
                }

                // Delete selector-selected images. Only the Liveblocks meta is
                // removed here; the storage blob is left for the cleanup cron
                // so that Ctrl+Z can restore the image without breaking.
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

                // Clear the selection box if the selector had a selection
                if (hadSelectorSelection) {
                    state.selectorRect = null;
                }

                // Delete pointer-tool single-selected image (meta only).
                const id = state.selectedImageId;
                if (id && !selectorImageIds.includes(id)) {
                    removeImageMeta(id);
                    state.pastedImages = state.pastedImages.filter(
                        (img) => img.id != id,
                    );
                    state.selectedImageId = null;
                }
            }
        };

        document.addEventListener("keydown", onKeypress);
        return () => document.removeEventListener("keydown", onKeypress);
    }, []);
};
