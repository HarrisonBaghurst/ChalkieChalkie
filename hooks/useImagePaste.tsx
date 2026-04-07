import { PastedImage, PastedImageMeta } from "@/types/imageTypes";
import { Point } from "@/types/strokeTypes";
import { RefObject, useEffect } from "react";

interface UseImagePasteProps {
    workspaceId: string;
    cursorPositionRef: RefObject<Point>;
    pastedImagesRef: RefObject<PastedImage[]>;
    pastedImagesMeta: readonly PastedImageMeta[] | null;
    addImageMeta: (meta: PastedImageMeta) => void;
}

export const usePastedImagesSync = ({
    pastedImagesRef,
    pastedImagesMeta,
}: Pick<UseImagePasteProps, "pastedImagesRef" | "pastedImagesMeta">) => {
    useEffect(() => {
        if (!pastedImagesMeta) return;

        const existingIds = new Set(
            pastedImagesRef.current.map((img) => img.id),
        );

        pastedImagesMeta.forEach((meta) => {
            if (existingIds.has(meta.id)) {
                const local = pastedImagesRef.current.find(
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
                    pastedImagesRef.current.push({
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
        pastedImagesRef.current = pastedImagesRef.current.filter((img) => {
            return metaIds.has(img.id);
        });
    }, [pastedImagesMeta]);
};

export const useImagePaste = ({
    workspaceId,
    cursorPositionRef,
    addImageMeta,
}: Omit<UseImagePasteProps, "pastedImagesMeta">) => {
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (!item.type.startsWith("image/")) continue;

                const file = item.getAsFile();
                if (!file) continue;

                const imageId = crypto.randomUUID();
                const { x, y } = cursorPositionRef.current;

                const dimensions = await new Promise<{
                    width: number;
                    height: number;
                }>((resolve) => {
                    const img = new Image();
                    const url = URL.createObjectURL(file);
                    img.onload = () => {
                        resolve({ width: img.width, height: img.height });
                        URL.revokeObjectURL(url);
                    };
                    img.src = url;
                });

                const formData = new FormData();
                formData.append("file", file);
                formData.append("imageId", imageId);
                formData.append("workspaceId", workspaceId);

                try {
                    const res = await fetch(
                        `${process.env.NEXT_PUBLIC_APP_URL}/api/workspaces/${workspaceId}/images`,
                        { method: "POST", body: formData },
                    );
                    const { url } = await res.json();
                    addImageMeta({
                        id: imageId,
                        url,
                        x,
                        y,
                        width: dimensions.width,
                        height: dimensions.height,
                    });
                } catch (err) {
                    console.error("Failed to upload image:", err);
                }

                e.preventDefault();
                break;
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, []);
};
