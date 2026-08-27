import { MAX_UPLOAD_BYTES } from "@/lib/imageLimits";

const LUMINANCE_SAMPLE_SIZE = 50;
const LUMINANCE_THRESHOLD = 128;

const envNumber = (raw: string | undefined, fallback: number): number => {
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const MAX_IMAGE_WIDTH = envNumber(
    process.env.NEXT_PUBLIC_MAX_IMAGE_WIDTH,
    512,
);
export const MAX_IMAGE_HEIGHT = envNumber(
    process.env.NEXT_PUBLIC_MAX_IMAGE_HEIGHT,
    512,
);
const IMAGE_QUALITY = Math.min(
    1,
    envNumber(process.env.NEXT_PUBLIC_IMAGE_QUALITY, 0.85),
);

// A PDF page arrives as a canvas rather than an <img>, and takes the identical
// path from here on.
export type ImageSource = HTMLImageElement | HTMLCanvasElement;

const sourceSize = (source: ImageSource) =>
    source instanceof HTMLImageElement
        ? { width: source.naturalWidth, height: source.naturalHeight }
        : { width: source.width, height: source.height };

export function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Image failed to load"));
        img.src = url;
    });
}

export function shouldInvert(source: ImageSource): boolean {
    const canvas = document.createElement("canvas");
    canvas.width = LUMINANCE_SAMPLE_SIZE;
    canvas.height = LUMINANCE_SAMPLE_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    ctx.drawImage(source, 0, 0, LUMINANCE_SAMPLE_SIZE, LUMINANCE_SAMPLE_SIZE);
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

const jpegName = (name: string) =>
    `${name.replace(/\.[^./\\]+$/, "") || "image"}.jpg`;

export async function prepareImageFile(
    source: ImageSource,
    name: string,
): Promise<File | null> {
    const { width, height } = sourceSize(source);
    if (width === 0 || height === 0) return null;

    const scale = Math.min(
        1,
        MAX_IMAGE_WIDTH / width,
        MAX_IMAGE_HEIGHT / height,
    );

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    if (
        shouldInvert(source) &&
        !invertInPlace(ctx, canvas.width, canvas.height)
    ) {
        return null;
    }

    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const blob = await toBlob(canvas, "image/jpeg", IMAGE_QUALITY);
    if (!blob || blob.size > MAX_UPLOAD_BYTES) return null;

    return new File([blob], jpegName(name), { type: "image/jpeg" });
}
