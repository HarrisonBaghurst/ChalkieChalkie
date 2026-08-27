export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg"]);
export const MAX_UPLOAD_BYTES = 1024 * 1024;

export const PDF_MIME_TYPE = "application/pdf";

export const ACCEPTED_INPUT_TYPES = new Set([
    ...ALLOWED_IMAGE_TYPES,
    PDF_MIME_TYPE,
]);

export const MAX_PDF_PAGES = 50;
