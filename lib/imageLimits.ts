// Shared by the client insert path and the images route, so the two can never
// drift into rejecting different files. The Supabase workspace-images bucket
// enforces the same byte cap independently — raise one and the other rejects
// the difference as an opaque 500, not the route's 413.
export const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg"]);
export const MAX_UPLOAD_BYTES = 1024 * 1024;
