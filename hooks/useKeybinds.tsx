import { CanvasState } from "@/types/canvasStateTypes";
import { RefObject, useEffect } from "react";
import { toast } from "sonner";

interface UseKeybindsProps {
    workspaceId: string;
    canvasStateRef: RefObject<CanvasState>;
    removeImageMeta: (id: string) => void;
    undo: () => void;
    redo: () => void;
    eraseStrokes: (ids: string[]) => void;
}

export const useKeybinds = ({
    workspaceId,
    canvasStateRef,
    removeImageMeta,
    undo,
    redo,
    eraseStrokes,
}: UseKeybindsProps) => {
    useEffect(() => {
        // TODO: this listener fires while typing in inputs (e.g. the
        // WorkspaceTopbar title field) — Backspace deletes selected
        // images/strokes and Ctrl+Z hits the canvas history. Bail out early
        // when event.target is an input/textarea/contenteditable.
        const onKeypress = async (event: KeyboardEvent) => {
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

                // Delete selector-selected images
                // TODO: deleting an image removes the storage blob
                // immediately, but Ctrl+Z restores the Liveblocks meta and
                // shows a broken image. Defer blob deletion to the cleanup
                // cron (only remove the meta here) so undo works.
                const selectorImageIds = [...state.selectedImageIds];
                if (selectorImageIds.length > 0) {
                    for (const id of selectorImageIds) {
                        removeImageMeta(id);
                        fetch(
                            `${process.env.NEXT_PUBLIC_APP_URL}/api/workspaces/${workspaceId}/images`,
                            {
                                method: "DELETE",
                                body: JSON.stringify({ imageId: id, workspaceId }),
                            },
                        ).catch(() =>
                            toast.error("Failed to delete image.", {
                                description: "Please reload page and try again.",
                            }),
                        );
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

                // Delete pointer-tool single-selected image
                const id = state.selectedImageId;
                if (id && !selectorImageIds.includes(id)) {
                    removeImageMeta(id);
                    try {
                        await fetch(
                            `${process.env.NEXT_PUBLIC_APP_URL}/api/workspaces/${workspaceId}/images`,
                            {
                                method: "DELETE",
                                body: JSON.stringify({ imageId: id, workspaceId }),
                            },
                        );
                        state.pastedImages = state.pastedImages.filter(
                            (img) => img.id != id,
                        );
                        state.selectedImageId = null;
                    } catch (err) {
                        console.error("Failed to delete image:", err);
                        toast.error("Failed to delete image.", {
                            description: "Please reload page and try again.",
                        });
                    }
                }
            }
        };

        document.addEventListener("keydown", onKeypress);
        return () => document.removeEventListener("keydown", onKeypress);
    }, []);
};
