import { RefObject, useCallback, useEffect, useRef } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { toast } from "sonner";
import { CanvasState } from "@/types/canvasStateTypes";
import { PastedImageMeta } from "@/types/imageTypes";
import { Rect } from "@/lib/genometry";
import { MAX_PDF_PAGES } from "@/lib/imageLimits";
import {
    MAX_IMAGE_HEIGHT,
    MAX_IMAGE_WIDTH,
    loadImage,
    prepareImageFile,
} from "@/lib/imagePrepare";
import {
    adoptPermanentUrl,
    reservePdfLease,
    rollbackImage,
    uploadWorkspaceImage,
} from "@/lib/imageUpload";
import { fitToViewport, viewportCentre } from "@/lib/viewport";
import { newId } from "@/lib/id";
import { InsertPlacement } from "./useInsertImage";

const PAGE_GAP_RATIO = 0.03;
const UPLOAD_CONCURRENCY = 3;

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

// Imported on demand: pdf.js dwarfs the rest of the board bundle, and a lesson
// that never opens a PDF should never pay to download it.
const getPdfjs = () => {
    pdfjsPromise ??= import("pdfjs-dist").then((lib) => {
        lib.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url,
        ).toString();
        return lib;
    });
    return pdfjsPromise;
};

const runPool = async <T,>(
    items: T[],
    limit: number,
    worker: (item: T) => Promise<void>,
): Promise<void> => {
    let next = 0;
    await Promise.all(
        Array.from({ length: Math.min(limit, items.length) }, async () => {
            while (next < items.length) await worker(items[next++]);
        }),
    );
};

interface UseInsertPdfProps {
    workspaceId: string;
    canvasStateRef: RefObject<CanvasState>;
    addImageMeta: (meta: PastedImageMeta) => void;
    onInserted?: (imageIds: string[]) => void;
}

export const useInsertPdf = ({
    workspaceId,
    canvasStateRef,
    addImageMeta,
    onInserted,
}: UseInsertPdfProps) => {
    const depsRef = useRef({ workspaceId, addImageMeta, onInserted });
    useEffect(() => {
        depsRef.current = { workspaceId, addImageMeta, onInserted };
    }, [workspaceId, addImageMeta, onInserted]);

    return useCallback(
        async (file: File, placement: InsertPlacement) => {
            const toastId = toast.loading("Reading PDF…");

            let doc: PDFDocumentProxy;
            try {
                const lib = await getPdfjs();
                const data = new Uint8Array(await file.arrayBuffer());
                doc = await lib.getDocument({ data }).promise;
            } catch (err) {
                console.error("Failed to read PDF:", err);
                toast.error("Could not read the PDF.", { id: toastId });
                return;
            }

            const pageCount = doc.numPages;
            if (pageCount > MAX_PDF_PAGES) {
                toast.error("PDF too long.", {
                    id: toastId,
                    description: `Up to ${MAX_PDF_PAGES} pages can be added. Split the file and try again.`,
                });
                doc.destroy();
                return;
            }

            let leaseId: string;
            try {
                leaseId = await reservePdfLease(
                    depsRef.current.workspaceId,
                    pageCount,
                );
            } catch (err) {
                console.error("Failed to reserve PDF upload:", err);
                toast.error("Too many PDF pages added recently.", {
                    id: toastId,
                    description: "Please wait a few minutes and try again.",
                });
                doc.destroy();
                return;
            }

            let renderScale: number;
            const pages: { pageNumber: number; id: string; rect: Rect }[] = [];

            try {
                const firstPage = await doc.getPage(1);
                const unscaled = firstPage.getViewport({ scale: 1 });

                renderScale = Math.min(
                    MAX_IMAGE_WIDTH / unscaled.width,
                    MAX_IMAGE_HEIGHT / unscaled.height,
                );
                if (!Number.isFinite(renderScale) || renderScale <= 0) {
                    throw new Error("PDF reports a zero-sized first page");
                }

                const state = canvasStateRef.current;
                const firstPixels = {
                    width: unscaled.width * renderScale,
                    height: unscaled.height * renderScale,
                };
                const firstWorld = fitToViewport(
                    firstPixels,
                    state.viewport,
                    state.canvasRect,
                );
                const worldPerPixel = firstWorld.width / firstPixels.width;
                const gap = firstWorld.height * PAGE_GAP_RATIO;

                let x: number;
                let y: number;
                if (placement === "viewport") {
                    const centre = viewportCentre(
                        state.viewport,
                        state.canvasRect,
                    );
                    x = centre.x - firstWorld.width / 2;
                    y = centre.y - firstWorld.height / 2;
                } else {
                    ({ x, y } = state.cursorPosition);
                }

                let stackY = y;
                for (let n = 1; n <= pageCount; n++) {
                    const page = n === 1 ? firstPage : await doc.getPage(n);
                    const viewport = page.getViewport({ scale: renderScale });
                    const width = viewport.width * worldPerPixel;
                    const height = viewport.height * worldPerPixel;
                    pages.push({
                        pageNumber: n,
                        id: newId(),
                        rect: { x, y: stackY, width, height },
                    });
                    stackY += height + gap;
                }
            } catch (err) {
                console.error("Failed to measure PDF pages:", err);
                toast.error("Could not read the PDF.", {
                    id: toastId,
                    description: "The file may be damaged or password locked.",
                });
                doc.destroy();
                return;
            }

            let completed = 0;
            const insertedIds: string[] = [];
            const failedPages: number[] = [];

            const progress = () =>
                toast.loading(
                    `Adding ${file.name}… ${completed} / ${pageCount}`,
                    {
                        id: toastId,
                    },
                );
            progress();

            await runPool(
                pages,
                UPLOAD_CONCURRENCY,
                async ({ pageNumber, id, rect }) => {
                    let blobUrl: string | null = null;
                    try {
                        const page = await doc.getPage(pageNumber);
                        const viewport = page.getViewport({
                            scale: renderScale,
                        });
                        const canvas = document.createElement("canvas");
                        canvas.width = Math.max(1, Math.round(viewport.width));
                        canvas.height = Math.max(
                            1,
                            Math.round(viewport.height),
                        );

                        await page.render({
                            canvas,
                            viewport,
                            background: "#ffffff",
                        }).promise;

                        const uploadFile = await prepareImageFile(
                            canvas,
                            `${file.name}-${pageNumber}`,
                        );
                        if (!uploadFile) {
                            throw new Error(
                                `Page ${pageNumber} could not be encoded under the size limit`,
                            );
                        }

                        blobUrl = URL.createObjectURL(uploadFile);
                        const element = await loadImage(blobUrl);

                        canvasStateRef.current.pastedImages.push({
                            id,
                            element,
                            url: blobUrl,
                            ...rect,
                        });

                        const permanentUrl = await uploadWorkspaceImage(
                            depsRef.current.workspaceId,
                            id,
                            uploadFile,
                            leaseId,
                        );

                        adoptPermanentUrl(
                            canvasStateRef,
                            id,
                            permanentUrl,
                            blobUrl,
                        );
                        depsRef.current.addImageMeta({
                            id,
                            url: permanentUrl,
                            ...rect,
                        });
                        insertedIds.push(id);
                    } catch (err) {
                        console.error(
                            `Failed to add PDF page ${pageNumber}:`,
                            err,
                        );
                        failedPages.push(pageNumber);
                        if (blobUrl) {
                            rollbackImage(canvasStateRef, id, blobUrl);
                        }
                    } finally {
                        completed++;
                        progress();
                    }
                },
            );

            doc.destroy();

            if (insertedIds.length === 0) {
                toast.error("Could not add the PDF.", {
                    id: toastId,
                    description: "Please reload the page and try again.",
                });
                return;
            }

            if (failedPages.length > 0) {
                toast.warning(
                    `Added ${insertedIds.length} of ${pageCount} pages.`,
                    {
                        id: toastId,
                        description: `${failedPages.length} could not be added.`,
                    },
                );
            } else {
                toast.success(
                    `Added ${pageCount} page${pageCount === 1 ? "" : "s"}.`,
                    { id: toastId },
                );
            }

            depsRef.current.onInserted?.(insertedIds);
        },
        [canvasStateRef],
    );
};
