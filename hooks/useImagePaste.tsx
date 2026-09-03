import { PastedImageMeta } from "@/types/imageTypes";
import { CanvasState } from "@/types/canvasStateTypes";
import { RefObject, useEffect, useRef } from "react";
import { ACCEPTED_INPUT_TYPES } from "@/lib/imageLimits";
import { isImageUnderLocalTransform } from "@/lib/handlers/tools/pointer";
import { InsertPlacement } from "./useInsertImage";

interface UsePastedImagesSyncProps {
    canvasStateRef: RefObject<CanvasState>;
    pastedImagesMeta: readonly PastedImageMeta[] | null;
}

export const usePastedImagesSync = ({
    canvasStateRef,
    pastedImagesMeta,
}: UsePastedImagesSyncProps) => {
    const loadingIds = useRef(new Set<string>());
    const liveIds = useRef(new Set<string>());

    useEffect(() => {
        if (!pastedImagesMeta) return;

        const state = canvasStateRef.current;
        const existingIds = new Set(state.pastedImages.map((img) => img.id));
        liveIds.current = new Set(pastedImagesMeta.map((m) => m.id));

        pastedImagesMeta.forEach((meta) => {
            if (existingIds.has(meta.id)) {
                const local = state.pastedImages.find(
                    (img) => img.id === meta.id,
                );
                if (local && !isImageUnderLocalTransform(state, meta.id)) {
                    local.x = meta.x;
                    local.y = meta.y;
                    local.width = meta.width;
                    local.height = meta.height;
                }
                return;
            }

            if (loadingIds.current.has(meta.id)) return;
            loadingIds.current.add(meta.id);

            const img = new Image();
            img.onload = () => {
                loadingIds.current.delete(meta.id);
                if (!liveIds.current.has(meta.id)) return;
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
            img.onerror = () => loadingIds.current.delete(meta.id);
            img.src = meta.url;
        });

        state.pastedImages = state.pastedImages.filter(
            (img) =>
                liveIds.current.has(img.id) ||
                state.pendingImageIds.has(img.id),
        );
    }, [pastedImagesMeta]);
};

export const useImagePaste = ({
    insertFile,
}: {
    insertFile: (file: File, placement: InsertPlacement) => void;
}) => {
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (!ACCEPTED_INPUT_TYPES.has(item.type)) continue;

                const file = item.getAsFile();
                if (!file) continue;

                e.preventDefault();
                insertFile(file, "cursor");
                break;
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, [insertFile]);
};
