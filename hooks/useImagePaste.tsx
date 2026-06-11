import { PastedImageMeta } from "@/types/imageTypes";
import { CanvasState } from "@/types/canvasStateTypes";
import { RefObject, useEffect } from "react";
import { toast } from "sonner";

interface UseImagePasteProps {
    workspaceId: string;
    canvasStateRef: RefObject<CanvasState>;
    pastedImagesMeta: readonly PastedImageMeta[] | null;
    addImageMeta: (meta: PastedImageMeta) => void;
}

// _____ helper functions _________________________________________________________________________

function shouldInvert(img: HTMLImageElement): boolean {
    const canvas = document.createElement("canvas");
    canvas.width = 50;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    ctx.drawImage(img, 0, 0, 50, 50);
    let data: ImageData;
    try {
        data = ctx.getImageData(0, 0, 50, 50);
    } catch {
        return false;
    }

    let total = 0;
    const pixels = data.data;
    const pixelCount = pixels.length / 4;

    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        // relative luminance formula
        total += 0.299 * r + 0.587 * g + 0.114 * b;
    }

    return total / pixelCount > 128;
}

// _____ hooks ____________________________________________________________________________________

export const usePastedImagesSync = ({
    canvasStateRef,
    pastedImagesMeta,
}: Pick<UseImagePasteProps, "canvasStateRef" | "pastedImagesMeta">) => {
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
                    local.inverted = meta.inverted;
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
                        inverted: meta.inverted,
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
    workspaceId,
    canvasStateRef,
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
                const { x, y } = canvasStateRef.current.cursorPosition;
                const blobUrl = URL.createObjectURL(file);

                const img = new Image();
                await new Promise<void>((resolve) => {
                    img.onload = () => resolve();
                    img.src = blobUrl;
                });

                const inverted = shouldInvert(img);

                canvasStateRef.current.pastedImages.push({
                    id: imageId,
                    element: img,
                    x,
                    y,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    url: blobUrl,
                    inverted,
                });

                (async () => {
                    try {
                        const formData = new FormData();
                        formData.append("file", file);
                        formData.append("imageId", imageId);
                        formData.append("workspaceId", workspaceId);

                        const res = await fetch(
                            `${process.env.NEXT_PUBLIC_APP_URL}/api/workspaces/${workspaceId}/images`,
                            { method: "POST", body: formData },
                        );

                        if (!res.ok) {
                            throw new Error(
                                `Image upload failed: ${res.status}`,
                            );
                        }

                        const { url: permanentUrl } = await res.json();

                        const local = canvasStateRef.current.pastedImages.find(
                            (i) => i.id === imageId,
                        );
                        if (local) {
                            const newImg = new Image();
                            newImg.onload = () => {
                                local.element = newImg;
                                local.url = permanentUrl;
                                URL.revokeObjectURL(blobUrl);
                            };
                            newImg.src = permanentUrl;
                        }

                        addImageMeta({
                            id: imageId,
                            url: permanentUrl,
                            x,
                            y,
                            width: img.naturalWidth,
                            height: img.naturalHeight,
                            inverted,
                        });
                    } catch (err) {
                        console.error("Failed to upload image:", err);
                        toast.error("Failed to upload image.", {
                            description: "Please reload page and try again.",
                        });
                        canvasStateRef.current.pastedImages =
                            canvasStateRef.current.pastedImages.filter(
                                (i) => i.id !== imageId,
                            );
                        URL.revokeObjectURL(blobUrl);
                    }
                })();

                e.preventDefault();
                break;
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, []);
};
