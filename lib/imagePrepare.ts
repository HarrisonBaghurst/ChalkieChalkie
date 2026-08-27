import { MAX_UPLOAD_BYTES } from "@/lib/imageLimits";

const LUMINANCE_SAMPLE_SIZE = 50;
const LUMINANCE_THRESHOLD = 128;
// Starting cap, then the search below gives up resolution before quality.
// Far past what the board draws — an image is fitted to 60% of the viewport —
// so the first attempt almost always fits.
const MAX_UPLOAD_EDGE = 2048;
const EDGE_STEPS = [1, 0.7, 0.5];
const JPEG_QUALITY_STEPS = [0.9, 0.75, 0.6];

export function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Image failed to load"));
        img.src = url;
    });
}

export function shouldInvert(img: HTMLImageElement): boolean {
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
        total += 0.299 * r + 0.587 * g + 0.114 * b;
    }

    return total / pixelCount > LUMINANCE_THRESHOLD;
}

function invertInPlace(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
): boolean {
    // Per-pixel, not ctx.filter: an unsupported filter value fails silently.
    let data: ImageData;
    try {
        data = ctx.getImageData(0, 0, width, height);
    } catch {
        return false;
    }

    const pixels = data.data;
    for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = 255 - pixels[i];
        pixels[i + 1] = 255 - pixels[i + 1];
        pixels[i + 2] = 255 - pixels[i + 2];
    }
    ctx.putImageData(data, 0, 0);
    return true;
}

function toBlob(
    canvas: HTMLCanvasElement,
    type: string,
    quality?: number,
): Promise<Blob | null> {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// Every image is re-encoded rather than passed through, and shrunk until it
// fits MAX_UPLOAD_BYTES. The storage bucket enforces the same cap, and a
// rejection there arrives as an opaque 500 instead of the route's 413.
// Inversion of over-bright images is baked in here so the stored bytes are
// what every client renders. Null means the caller should fall back to the
// original, whose own size check will then reject it.
export async function prepareImageFile(
    img: HTMLImageElement,
    file: File,
): Promise<File | null> {
    const { naturalWidth, naturalHeight } = img;
    // Capped at 1: shrinking an already-small image is the job, upscaling a
    // thumbnail into the budget is not.
    const baseScale = Math.min(
        1,
        MAX_UPLOAD_EDGE / Math.max(naturalWidth, naturalHeight),
    );
    const invert = shouldInvert(img);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const render = (scale: number): boolean => {
        canvas.width = Math.max(1, Math.round(naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(naturalHeight * scale));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return !invert || invertInPlace(ctx, canvas.width, canvas.height);
    };

    const asFile = (blob: Blob) =>
        new File([blob], file.name || "image", { type: blob.type });

    // PNG ignores the quality argument, so a single attempt settles it. A PNG
    // that misses a budget this size is photographic, and only JPEG will bring
    // it down — flattening alpha to black, which reads as nothing on the dark
    // canvas.
    if (file.type !== "image/jpeg") {
        if (!render(baseScale)) return null;
        const png = await toBlob(canvas, "image/png");
        if (png && png.size <= MAX_UPLOAD_BYTES) return asFile(png);
    }

    for (const step of EDGE_STEPS) {
        if (!render(baseScale * step)) return null;
        for (const quality of JPEG_QUALITY_STEPS) {
            const blob = await toBlob(canvas, "image/jpeg", quality);
            if (!blob) return null;
            if (blob.size <= MAX_UPLOAD_BYTES) return asFile(blob);
        }
    }

    return null;
}
