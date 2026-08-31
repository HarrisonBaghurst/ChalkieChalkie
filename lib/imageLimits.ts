export const ALLOWED_IMAGE_STORAGE_TYPES = new Set(["image/png", "image/jpeg"]);
export const MAX_UPLOAD_BYTES = 1024 * 1024;

export const PDF_MIME_TYPE = "application/pdf";

export const ACCEPTED_IMAGE_INPUT_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
]);

export const ACCEPTED_INPUT_TYPES = new Set([
    ...ACCEPTED_IMAGE_INPUT_TYPES,
    PDF_MIME_TYPE,
]);

export const MAX_PDF_PAGES = 50;
