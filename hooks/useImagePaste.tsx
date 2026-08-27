import { PastedImageMeta } from "@/types/imageTypes";
import { CanvasState } from "@/types/canvasStateTypes";
import { RefObject, useEffect } from "react";
import { InsertPlacement } from "./useInsertImage";

interface UsePastedImagesSyncProps {
    canvasStateRef: RefObject<CanvasState>;
    pastedImagesMeta: readonly PastedImageMeta[] | null;
}

export const usePastedImagesSync = ({
    canvasStateRef,
    pastedImagesMeta,
}: UsePastedImagesSyncProps) => {
    useEffect(() => {
        if (!pastedImagesMeta) return;

        const state = canvasStateRef.current;
        const existingIds = new Set(
            state.pastedImages.map((img) => img.id),
        );

        pastedImagesMeta.forEach((meta) => {
            if (existingIds.has(meta.id)) {
                const local = state.pastedImages.find(
                    (img) => img.id === meta.id,
                );
                if (local) {
                    local.x = meta.x;
                    local.y = meta.y;
                    local.width = meta.width;
                    local.height = meta.height;
                }
            } else {
                const img = new Image();
                img.onload = () => {
                    state.pastedImages.push({
                        id: meta.id,
                        element: img,
                        x: meta.x,
                        y: meta.y,
                        width: meta.width,
                        height: meta.height,
                        url: meta.url,
                    });
                };
                img.src = meta.url;
            }
        });

        const metaIds = new Set(pastedImagesMeta.map((m) => m.id));
        state.pastedImages = state.pastedImages.filter((img) => {
            return metaIds.has(img.id);
        });
    }, [pastedImagesMeta]);
};

export const useImagePaste = ({
    insertImage,
}: {
    insertImage: (file: File, placement: InsertPlacement) => void;
}) => {
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (!item.type.startsWith("image/")) continue;

                const file = item.getAsFile();
                if (!file) continue;

                // Before insertImage, which yields on its first await — by
                // which point the default paste has already run.
                e.preventDefault();
                insertImage(file, "cursor");
                break;
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, [insertImage]);
};
