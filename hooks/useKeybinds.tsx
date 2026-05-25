import { PastedImage } from "@/types/imageTypes";
import { Rect } from "@/lib/genometry";
import { RefObject, useEffect } from "react";
import { toast } from "sonner";

interface UseKeybindsProps {
    workspaceId: string;
    selectedImageIdRef: RefObject<string | null>;
    pastedImagesRef: RefObject<PastedImage[]>;
    removeImageMeta: (id: string) => void;
    undo: () => void;
    redo: () => void;
    selectedStrokeIdsRef: RefObject<string[]>;
    selectedImageIdsRef: RefObject<string[]>;
    selectorRectRef: RefObject<Rect | null>;
    eraseStrokes: (ids: string[]) => void;
}

export const useKeybinds = ({
    workspaceId,
    selectedImageIdRef,
    pastedImagesRef,
    removeImageMeta,
    undo,
    redo,
    selectedStrokeIdsRef,
    selectedImageIdsRef,
    selectorRectRef,
    eraseStrokes,
}: UseKeybindsProps) => {
    useEffect(() => {
        const onKeypress = async (event: KeyboardEvent) => {
            if (event.ctrlKey && event.key === "z") {
                event.preventDefault();
                undo();
            } else if (event.ctrlKey && event.key === "y") {
                event.preventDefault();
                redo();
            } else if (event.key === "Delete" || event.key === "Backspace") {
                // Delete selector-selected strokes
                const hadSelectorSelection =
                    selectedStrokeIdsRef.current.length > 0 ||
                    selectedImageIdsRef.current.length > 0;

                if (selectedStrokeIdsRef.current.length > 0) {
                    eraseStrokes([...selectedStrokeIdsRef.current]);
                    selectedStrokeIdsRef.current = [];
                }

                // Delete selector-selected images
                const selectorImageIds = [...selectedImageIdsRef.current];
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
                    pastedImagesRef.current = pastedImagesRef.current.filter(
                        (img) => !selectorImageIds.includes(img.id),
                    );
                    selectedImageIdsRef.current = [];
                }

                // Clear the selection box if the selector had a selection
                if (hadSelectorSelection) {
                    selectorRectRef.current = null;
                }

                // Delete pointer-tool single-selected image
                const id = selectedImageIdRef.current;
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
                        pastedImagesRef.current = pastedImagesRef.current.filter(
                            (img) => img.id != id,
                        );
                        selectedImageIdRef.current = null;
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
