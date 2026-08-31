import { RefObject, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { CanvasState } from "@/types/canvasStateTypes";
import { PastedImageMeta } from "@/types/imageTypes";
import { Rect } from "@/lib/genometry";
import {
    ACCEPTED_IMAGE_INPUT_TYPES,
    MAX_UPLOAD_BYTES,
} from "@/lib/imageLimits";
import { loadImage, prepareImageFile } from "@/lib/imagePrepare";
import {
    adoptPermanentUrl,
    rollbackImage,
    uploadWorkspaceImage,
} from "@/lib/imageUpload";
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
            if (!ACCEPTED_IMAGE_INPUT_TYPES.has(file.type)) {
                toast.error("Unsupported image type.", {
                    description: "Only PNG, JPEG and WebP images can be added.",
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

            const uploadFile = await prepareImageFile(sourceImage, file.name);
            URL.revokeObjectURL(sourceUrl);

            if (!uploadFile) {
                toast.error("Image too large.", {
                    description: `Images must be under ${
                        MAX_UPLOAD_BYTES / (1024 * 1024)
                    } MB once resized.`,
                });
                return;
            }

            const displayUrl = URL.createObjectURL(uploadFile);
            let displayImage: HTMLImageElement;
            try {
                displayImage = await loadImage(displayUrl);
            } catch {
                URL.revokeObjectURL(displayUrl);
                toast.error("Could not read the image.");
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
                const permanentUrl = await uploadWorkspaceImage(
                    roomId,
                    imageId,
                    uploadFile,
                );

                adoptPermanentUrl(
                    canvasStateRef,
                    imageId,
                    permanentUrl,
                    displayUrl,
                );

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
                rollbackImage(canvasStateRef, imageId, displayUrl);
            }
        },
        [canvasStateRef],
    );
};
