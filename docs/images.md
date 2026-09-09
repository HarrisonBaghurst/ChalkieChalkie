# Images & PDFs

## Image Storage & Serving

Images live in a **private** Cloudflare R2 bucket at `{workspaceId}/{imageId}`, and `PastedImageMeta.url` holds the path `/api/workspaces/{workspaceId}/images/{imageId}` — **never a signed URL**. Every read is authorised at request time by `images/[imageId]/route.ts`, which checks the Clerk session and `Room.user_ids`, then 302s to an R2 URL presigned for **60 seconds**. The browser follows the redirect and pulls bytes straight from R2, so no image data transits Vercel.

- **Nothing persisted anywhere is a credential.** This is the whole point of the design. The previous model stored a 14-day Supabase signed URL in room storage, which meant anyone handed that link could load the image without being in the room, and rooms outliving the TTL showed broken images. Both problems are gone because the stored value grants nothing on its own.
- **`img.src` works with the bare path** because the request is same-origin and carries the Clerk cookie automatically. `proxy.ts`'s matcher runs `clerkMiddleware` on `/(api|trpc)(.*)`, which is what makes `auth()` resolve inside the route — the board pages themselves being in `isProtectedRoute` is unrelated and not sufficient.
- **The 302 is `Cache-Control: no-store`.** A cached redirect would outlive both its signature and the membership that earned it, so removing someone from a room would not bite until the browser felt like revalidating. Do not "optimise" this by caching the redirect; cache the _object_ behind it if that ever matters.
- **Presigning is a local HMAC, not a network call**, so the per-image cost is the Clerk check plus one Supabase membership query. That query is the real per-image cost — a 50-page PDF opens 50 of them. If that ever bites, cache membership in Redis briefly rather than moving the check off the read path.
- **Approach chosen over batch-presigning at room open** (the Notion/Figma model) because the document arrives over the realtime websocket, not an API response there'd be anywhere to attach signed URLs to — and because images stream in mid-session when someone else pastes, which would otherwise need a client-side signing subscription with expiry tracking and retry. This redirect model is Rails ActiveStorage's default and the OCI distribution spec's blob behaviour.
- **Expiry after load is harmless.** `usePastedImagesSync` decodes each image once into an `HTMLImageElement` the render loop draws from forever; the URL matters only at load, which is why 60 seconds is not tight.
- R2 access is wrapped in `lib/r2.ts`. Room teardown deletes by `{workspaceId}/` prefix (`deleteWorkspaceImages`), paginating the list and mapping each page to one `DeleteObjects` call, since both cap at 1000 keys.
- **The migration was a hard cut**: images uploaded before it still hold absolute Supabase URLs in their room's meta and are simply gone. There is no fallback path, and the `workspace-images` Supabase bucket is orphaned — no code touches it.

## PDF Insertion

A PDF is never stored as a PDF. `hooks/useInsertPdf.tsx` rasterises each page client-side with pdf.js and pushes them through the same encoder, upload route and image meta as any pasted image — a page on the canvas is an ordinary `PastedImageMeta` with no PDF-ness left in it, which is why hit-testing, resize, delete and remote sync all work unchanged.

- **pdf.js is imported lazily**, on the first PDF only. It is a 420 KB chunk and a lesson that never opens one should not download it. The worker is resolved with `new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url)`, which Turbopack emits under `/_next/static/media/` — already inside `proxy.ts`'s skip list.
- **The page render scale is deliberately _not_ capped at 1**, unlike `prepareImageFile`'s. A PDF page is vector, so there is no native resolution to preserve; scale 1 means 72 dpi and a blurry page. The cap belongs on bitmaps only.
- **`background: "#ffffff"` is pinned on every `page.render`** rather than left to the library default. `shouldInvert` reads mean luminance, so a transparent background reads as dark and skips the inversion every other page gets — one white sheet in a dark stack.
- **Pages stack vertically at a single scale derived from page 1**, so a file mixing page sizes stays uniform. Gap is a fraction of page height, not a world constant.
- **Selection after insert uses the marquee model** (`selectedImageIds` + `selectionBounds`), not `selectedImageId`, which holds exactly one id. The trade is no resize handles: the point of selecting a document is dragging all its pages together.
- **Rate limiting is charged once, up front.** `images/reserve` spends `pageCount` tokens against `workspace-pdf:upload` in one atomic call and returns a lease; each page upload spends the lease instead of a token. So a refusal happens before anything renders and can never strand half a document. See Rate Limiting below.
- Pages upload through a small concurrency pool and appear as each commits. A failure mid-run leaves the earlier pages placed and reports the count — deliberately, since a partial document is recoverable and a silent rollback of 40 pages is not.
