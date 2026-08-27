import { RefObject, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { CanvasState } from "@/types/canvasStateTypes";
import { PastedImageMeta } from "@/types/imageTypes";
import { Rect } from "@/lib/genometry";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/imageLimits";
import { loadImage, prepareImageFile } from "@/lib/imagePrepare";
import { fitToViewport, viewportCentre } from "@/lib/viewport";
import { newId } from "@/lib/id";

// "cursor" keeps the pasted-at-the-mouse behaviour; "viewport" is for entry
// points with no pointer to read, which is every one of them on a tablet.
export type InsertPlacement = "cursor" | "viewport";

interface UseInsertImageProps {
    workspaceId: string;
    canvasStateRef: RefObject<CanvasState>;
    addImageMeta: (meta: PastedImageMeta) => void;
    onInserted?: (imageId: string, rect: Rect) => void;
}

export const useInsertImage = ({
    workspaceId,
    canvasStateRef,
    addImageMeta,
    onInserted,
}: UseInsertImageProps) => {
    // Kept in a ref so the returned callback is stable, and the paste listener
    // that holds it never has to resubscribe.
    const depsRef = useRef({ workspaceId, addImageMeta, onInserted });
    useEffect(() => {
        depsRef.current = { workspaceId, addImageMeta, onInserted };
    }, [workspaceId, addImageMeta, onInserted]);

    return useCallback(
        async (file: File, placement: InsertPlacement) => {
            if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
                toast.error("Unsupported image type.", {
                    description: "Only PNG and JPEG images can be added.",
                });
                return;
            }

            const imageId = newId();
            const sourceUrl = URL.createObjectURL(file);

            let sourceImage: HTMLImageElement;
            try {
                sourceImage = await loadImage(sourceUrl);
            } catch {
                URL.revokeObjectURL(sourceUrl);
                toast.error("Could not read the image.");
                return;
            }

            // Always re-encoded: downscaled to fit the byte budget and, if too
            // bright for the dark canvas, inverted — baked into the bytes
            // rather than carried as a render-time flag.
            let uploadFile = file;
            let displayImage = sourceImage;
            let displayUrl = sourceUrl;

            const prepared = await prepareImageFile(sourceImage, file);
            if (prepared) {
                const preparedUrl = URL.createObjectURL(prepared);
                try {
                    displayImage = await loadImage(preparedUrl);
                    uploadFile = prepared;
                    displayUrl = preparedUrl;
                    URL.revokeObjectURL(sourceUrl);
                } catch {
                    URL.revokeObjectURL(preparedUrl);
                }
            }

            // Only reachable when prepareImageFile could not re-encode at all;
            // caught here so it fails as itself, not as a generic upload error.
            if (uploadFile.size > MAX_UPLOAD_BYTES) {
                URL.revokeObjectURL(displayUrl);
                toast.error("Image too large.", {
                    description: `Images must be under ${
                        MAX_UPLOAD_BYTES / (1024 * 1024)
                    } MB.`,
                });
                return;
            }

            const state = canvasStateRef.current;
            const { width, height } = fitToViewport(
                {
                    width: displayImage.naturalWidth,
                    height: displayImage.naturalHeight,
                },
                state.viewport,
                state.canvasRect,
            );

            let x: number;
            let y: number;
            if (placement === "viewport") {
                const centre = viewportCentre(state.viewport, state.canvasRect);
                x = centre.x - width / 2;
                y = centre.y - height / 2;
            } else {
                ({ x, y } = state.cursorPosition);
            }

            state.pastedImages.push({
                id: imageId,
                element: displayImage,
                x,
                y,
                width,
                height,
                url: displayUrl,
            });

            depsRef.current.onInserted?.(imageId, { x, y, width, height });

            const { workspaceId: roomId } = depsRef.current;
            try {
                const formData = new FormData();
                formData.append("file", uploadFile);
                formData.append("imageId", imageId);
                formData.append("workspaceId", roomId);

                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_APP_URL}/api/workspaces/${roomId}/images`,
                    { method: "POST", body: formData },
                );

                if (!res.ok) {
                    // The route's { error } body says which gate rejected it;
                    // a bare status leaves that guesswork.
                    const detail = await res.text().catch(() => "");
                    throw new Error(
                        `Image upload failed: ${res.status} ${detail}`,
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

                depsRef.current.addImageMeta({
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
                const failed = canvasStateRef.current;
                failed.pastedImages = failed.pastedImages.filter(
                    (i) => i.id !== imageId,
                );
                if (failed.selectedImageId === imageId) {
                    failed.selectedImageId = null;
                    failed.imageTransformOrigin = null;
                }
                URL.revokeObjectURL(displayUrl);
            }
        },
        [canvasStateRef],
    );
};
