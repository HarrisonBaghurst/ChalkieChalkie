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

// must stay in sync with ALLOWED_MIME_TYPES in
// app/api/workspaces/[workspaceId]/images/route.ts
const ALLOWED_PASTE_TYPES = new Set(["image/png", "image/jpeg"]);
const LUMINANCE_SAMPLE_SIZE = 50;
const LUMINANCE_THRESHOLD = 128;
const JPEG_QUALITY = 0.92;

// _____ helper functions _________________________________________________________________________

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Image failed to load"));
        img.src = url;
    });
}

function shouldInvert(img: HTMLImageElement): boolean {
    const canvas = document.createElement("canvas");
    canvas.width = LUMINANCE_SAMPLE_SIZE;
    canvas.height = LUMINANCE_SAMPLE_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    ctx.drawImage(img, 0, 0, LUMINANCE_SAMPLE_SIZE, LUMINANCE_SAMPLE_SIZE);
    let data: ImageData;
    try {
        data = ctx.getImageData(
            0,
            0,
            LUMINANCE_SAMPLE_SIZE,
            LUMINANCE_SAMPLE_SIZE,
        );
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

    return total / pixelCount > LUMINANCE_THRESHOLD;
}

/**
 * Bakes an inversion into the image's pixels and re-encodes it in its source
 * format, so the uploaded bytes are what every user renders. Returns null if
 * the browser cannot produce the inverted file, in which case the caller
 * uploads the original untouched.
 */
async function invertImageFile(
    img: HTMLImageElement,
    file: File,
): Promise<File | null> {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0);

    // inverted per-pixel rather than with ctx.filter — canvas filter support is
    // engine-dependent and assigning an unsupported value fails silently
    let data: ImageData;
    try {
        data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch {
        return null;
    }

    const pixels = data.data;
    for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = 255 - pixels[i];
        pixels[i + 1] = 255 - pixels[i + 1];
        pixels[i + 2] = 255 - pixels[i + 2];
    }
    ctx.putImageData(data, 0, 0);

    // re-encoding as the source type keeps the upload roughly its original
    // size — a photo forced to PNG can blow past the route's 5 MB limit
    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
            resolve,
            file.type,
            file.type === "image/jpeg" ? JPEG_QUALITY : undefined,
        );
    });
    if (!blob) return null;

    return new File([blob], file.name || "pasted-image", { type: file.type });
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

                // must happen before the first await — once the handler yields,
                // the default paste has already run
                e.preventDefault();

                if (!ALLOWED_PASTE_TYPES.has(file.type)) {
                    toast.error("Unsupported image type.", {
                        description: "Only PNG and JPEG images can be pasted.",
                    });
                    break;
                }

                const imageId = crypto.randomUUID();
                const { x, y } = canvasStateRef.current.cursorPosition;
                const sourceUrl = URL.createObjectURL(file);

                let sourceImage: HTMLImageElement;
                try {
                    sourceImage = await loadImage(sourceUrl);
                } catch {
                    URL.revokeObjectURL(sourceUrl);
                    toast.error("Could not read the pasted image.");
                    break;
                }

                // bright images are inverted for the dark canvas. The inversion
                // is baked into the uploaded bytes rather than carried as a
                // flag, so every user renders identical pixels with no
                // per-client filter support to depend on
                let uploadFile = file;
                let displayImage = sourceImage;
                let displayUrl = sourceUrl;

                if (shouldInvert(sourceImage)) {
                    const invertedFile = await invertImageFile(
                        sourceImage,
                        file,
                    );
                    if (invertedFile) {
                        const invertedUrl = URL.createObjectURL(invertedFile);
                        try {
                            displayImage = await loadImage(invertedUrl);
                            uploadFile = invertedFile;
                            displayUrl = invertedUrl;
                            URL.revokeObjectURL(sourceUrl);
                        } catch {
                            URL.revokeObjectURL(invertedUrl);
                        }
                    }
                }

                const { naturalWidth: width, naturalHeight: height } =
                    displayImage;

                canvasStateRef.current.pastedImages.push({
                    id: imageId,
                    element: displayImage,
                    x,
                    y,
                    width,
                    height,
                    url: displayUrl,
                });

                (async () => {
                    try {
                        const formData = new FormData();
                        formData.append("file", uploadFile);
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
                                URL.revokeObjectURL(displayUrl);
                            };
                            newImg.src = permanentUrl;
                        }

                        addImageMeta({
                            id: imageId,
                            url: permanentUrl,
                            x,
                            y,
                            width,
                            height,
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
                        URL.revokeObjectURL(displayUrl);
                    }
                })();

                break;
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, []);
};
