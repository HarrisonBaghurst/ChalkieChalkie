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
    pastedImagesRef,
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
                const blobUrl = URL.createObjectURL(file);

                const img = new Image();
                await new Promise<void>((resolve) => {
                    img.onload = () => resolve();
                    img.src = blobUrl;
                });

                pastedImagesRef.current.push({
                    id: imageId,
                    element: img,
                    x,
                    y,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    url: blobUrl,
                    inverted: shouldInvert(img),
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
                        const { url: permanentUrl } = await res.json();

                        const local = pastedImagesRef.current.find(
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
                        });
                    } catch (err) {
                        console.error("Failed to upload image:", err);
                        pastedImagesRef.current =
                            pastedImagesRef.current.filter(
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
