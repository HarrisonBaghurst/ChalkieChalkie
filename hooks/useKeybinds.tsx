import { PastedImage } from "@/types/imageTypes";
import { RefObject, useEffect } from "react";
import { toast } from "sonner";

interface UseKeybindsProps {
    workspaceId: string;
    selectedImageIdRef: RefObject<string | null>;
    pastedImagesRef: RefObject<PastedImage[]>;
    removeImageMeta: (id: string) => void;
    undo: () => void;
    redo: () => void;
}

export const useKeybinds = ({
    workspaceId,
    selectedImageIdRef,
    pastedImagesRef,
    removeImageMeta,
    undo,
    redo,
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
                const id = selectedImageIdRef.current;
                if (!id) return;

                removeImageMeta(id);

                try {
                    const res = await fetch(
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
                        position: "top-center",
                        description: "Please reload page and try again.",
                    });
                }
            }
        };

        document.addEventListener("keydown", onKeypress);
        return () => document.removeEventListener("keydown", onKeypress);
    }, []);
};
