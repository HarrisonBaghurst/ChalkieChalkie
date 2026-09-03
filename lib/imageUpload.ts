import { RefObject } from "react";
import { CanvasState } from "@/types/canvasStateTypes";
import { PastedImage, PastedImageMeta } from "@/types/imageTypes";

// leaseId is the PDF path's pre-paid quota: the route decrements it instead of
// charging the per-image limiter once per page. It travels as a header so the
// route can read it before parsing the body.
export async function uploadWorkspaceImage(
    workspaceId: string,
    imageId: string,
    file: File,
    leaseId?: string,
): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("imageId", imageId);
    formData.append("workspaceId", workspaceId);

    const res = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/workspaces/${workspaceId}/images`,
        {
            method: "POST",
            body: formData,
            headers: leaseId ? { "x-pdf-lease": leaseId } : undefined,
        },
    );

    if (!res.ok) {
        // The route's { error } body says which gate rejected it; a bare
        // status leaves that guesswork.
        const detail = await res.text().catch(() => "");
        throw new Error(`Image upload failed: ${res.status} ${detail}`);
    }

    const { url } = await res.json();
    return url as string;
}

// Throws on refusal — a 429 here means the whole PDF is over budget, which the
// caller reports before rendering anything.
export async function reservePdfLease(
    workspaceId: string,
    pageCount: number,
): Promise<string> {
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/workspaces/${workspaceId}/images/reserve`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pageCount }),
        },
    );

    if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`PDF reserve failed: ${res.status} ${detail}`);
    }

    const { leaseId } = await res.json();
    return leaseId as string;
}

// The blob URL is only revoked once the signed one has decoded, or the image
// blinks out between the swap and the load.
function adoptPermanentUrl(
    local: PastedImage,
    permanentUrl: string,
    blobUrl: string,
): void {
    const img = new Image();
    img.onload = () => {
        local.element = img;
        local.url = permanentUrl;
        URL.revokeObjectURL(blobUrl);
    };
    img.src = permanentUrl;
}

export function commitUploadedImage(
    canvasStateRef: RefObject<CanvasState>,
    imageId: string,
    permanentUrl: string,
    blobUrl: string,
): PastedImageMeta | null {
    const state = canvasStateRef.current;
    state.pendingImageIds.delete(imageId);

    const local = state.pastedImages.find((i) => i.id === imageId);
    if (!local) {
        URL.revokeObjectURL(blobUrl);
        return null;
    }

    adoptPermanentUrl(local, permanentUrl, blobUrl);

    return {
        id: imageId,
        url: permanentUrl,
        x: local.x,
        y: local.y,
        width: local.width,
        height: local.height,
    };
}

export function rollbackImage(
    canvasStateRef: RefObject<CanvasState>,
    imageId: string,
    blobUrl: string,
): void {
    const state = canvasStateRef.current;
    state.pendingImageIds.delete(imageId);
    state.pastedImages = state.pastedImages.filter((i) => i.id !== imageId);
    if (state.selectedImageId === imageId) {
        state.selectedImageId = null;
        state.imageTransformOrigin = null;
    }
    state.selectedImageIds = state.selectedImageIds.filter(
        (id) => id !== imageId,
    );
    URL.revokeObjectURL(blobUrl);
}
