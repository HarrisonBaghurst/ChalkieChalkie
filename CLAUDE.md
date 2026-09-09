# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
Always address me by name at the beginning of a responce (Harrison).
Always interview and never make blind assumptions.
Give all plans concisely.

## Project Overview

ChalkieChalkie is a real-time collaborative whiteboard application for tutoring. Tutors schedule lessons (workspaces) with students, and multiple users can draw, highlight, erase, select/move, and paste images on a shared canvas simultaneously.

**Core tech stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui on Radix primitives, Cloudflare Workers + Durable Objects (real-time sync), Cloudflare R2 (image storage), Clerk (auth), Supabase (PostgreSQL), Upstash Redis (rate limiting), Resend (contact emails), sonner (toasts), lucide-react (icons), motion (animation).

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint

cd realtime
npm run dev        # wrangler dev on :8787 — the board needs this running
npm run typecheck  # tsc over the Worker; not covered by the root build
npm run deploy     # wrangler deploy
npm run tail       # live production logs
```

No test suite exists in this project.

The Worker is a **separate npm project** with its own `package.json`, `tsconfig.json` and `node_modules`. It is excluded from the root `tsconfig.json` and from `eslint.config.mjs`, because Cloudflare's globals and the Next/React rules do not apply to each other — so `npm run build` at the root will not catch a Worker error. Run its typecheck separately.

`realtime/package.json` pins **wrangler 4.86** because anything newer requires Node 22 and this machine is on 20. `compatibility_date` in `wrangler.jsonc` is bounded by that binary; raise both together.

## Required Environment Variables

Create `.env.local` with:

- `NEXT_PUBLIC_REALTIME_URL` (e.g. `wss://realtime.chalkiechalkie.com`, or `ws://localhost:8787` against `wrangler dev`), `REALTIME_TICKET_SECRET`, `REALTIME_ADMIN_SECRET` — the last two are shared with the Worker and set there with `wrangler secret put`. `lib/realtimeAdmin.ts` derives its HTTP origin from `NEXT_PUBLIC_REALTIME_URL` by swapping the `ws` scheme, so the two can never drift apart
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`
- `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` — Cloudflare R2, where every pasted image and rasterised PDF page is stored. The API token needs **Object Read & Write** on that bucket and nothing more. The bucket must stay **private**: no public dev URL, no unauthenticated custom domain, since the app's own route is the only thing that authorises a read (see Image Storage & Serving below)
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`)
- `NEXT_PUBLIC_MAX_IMAGE_WIDTH`, `NEXT_PUBLIC_MAX_IMAGE_HEIGHT`, `NEXT_PUBLIC_IMAGE_QUALITY` — the box every image and PDF page is scaled into, and the JPEG quality it is encoded at. All three are optional, defaulting to `2048`/`2048`/`0.85` in `lib/imagePrepare.ts`. **Client-side, so advisory only** — a tampered value still meets the route's 413 and the storage bucket's own limit. `NEXT_PUBLIC_` is inlined at build time, so changing one needs a rebuild, not just a redeploy
- `RESEND_API_KEY`, `CONTACT_EMAIL`
- `CRON_SECRET`
- `VERCEL_TOKEN` — Vercel access token used by the nightly promotion cron; `VERCEL_TEAM_ID` as well if the project ever moves off a personal account. `VERCEL_PROJECT_ID` comes free from Vercel's system environment variables.
- `ENVIRONMENT` — set to `testing` to render the dashboard from `data/testWorkspaces.json` instead of live API data
- `DEBUG` — set to `true` to show the Tailwind breakpoint badge (`components/DebugBreakpoint.tsx`) in the bottom-left of every page. Server-only on purpose, so the flag never reaches the client bundle
- `ALLOWED_DEV_ORIGINS` — the LAN address (e.g. `192.168.1.227`) `next dev` should accept cross-origin requests from, so the dev server is reachable from a phone or another machine on the network. Read in `next.config.ts`; **one origin only** — the value is passed straight through as a single array entry, so a comma-separated list would be treated as one bogus host

## Design System

**Before writing or changing any UI, read the style guide.** It is the single reference for colour tokens, the type scale, rounding tiers, the chalk gradient, motion, and every shared component — and it renders the real tokens and primitives rather than describing them, so it cannot silently go stale.

- **Live page:** `/style-guide` — signed-in **admin** accounts only; everyone else gets a 404
- **Source:** `components/styleGuide/` (sections in `components/styleGuide/sections/`)
- **Underlying truth:** tokens and utility classes in `app/globals.css`, primitives in `components/ui/`, the class merger in `lib/utils.ts`

The rules that matter most when editing (all covered in full on the page):

- Merge classes with `cn()` from `lib/utils.ts` — it registers the `text-display … text-caption` scale with tailwind-merge, which otherwise mistakes those for text colours and drops one of size/colour.
- Use semantic tokens, never literal colours or stock Tailwind greys. The shadcn token block in `globals.css` aliases onto the semantic tokens; never put a literal value there.
- Use the type scale (`text-body`, `text-caption`, …), never raw `text-sm`/`text-lg`. Those classes live in `@layer components`, so a utility-layer size outranks them — which is why no primitive in `components/ui/` carries a `text-*` size in its base class string.
- Use the rounding tiers `radius-tag` / `radius-control` / `radius-surface` over raw `rounded-*`.
- `dark:` modifiers are dead code — nothing sets `.dark`; the app is permanently dark via `:root`. Strip them when pasting from the shadcn registry.
- Four-space indentation. There is no Prettier config, so a bare `npx prettier --write` reformats to two spaces. Files under `components/ui/` came from the registry at two spaces and are left as-is.
- British spelling in identifiers and copy (`colour`, `optimisation`); shadcn's `--color-*` token names are the exception.

When you add a token, utility class or shared component, add a specimen to the style guide in the same change.

## Comments

Do not add comments to code, if you deem a comment is neccessary, explain the information you want to give in the cli instead.

## Architecture

### Route Structure

- `app/(home)/` — Public landing page (hero, beta sign-up, contact) with its own `Navbar` + `Footer` layout
- `app/(legal)/` — `privacy-policy`, `terms-of-service`, `cookie-policy`; content authored as JSON in `data/policies/` and rendered by `components/policy/PolicyDocument.tsx`. `changelog` also lives here despite not being a legal page: it wants exactly this layout's `Navbar` + `Footer` chrome, and a route group affects nothing but which layout wraps the page (see Changelog below)
- `app/dashboard/` — Authenticated dashboard: upcoming/past lessons, filters, workspace create/edit modal (`components/dashboard/`)
- `app/dashboard/connections/` — Tutor↔student linking: "Your Students" (tutor) / "Your Tutors" (student), invite-code exchange in a Dialog (`components/dashboard/connections/`)
- `app/board/[boardId]/` — The whiteboard canvas page; wraps `<Workspace>` in the realtime `<Room>` provider (`Room.tsx`)
- `app/sign-in/` — Clerk sign-in page (styled via `lib/clerkAppearance.ts`)
- `app/style-guide/` — Admin-only design system reference (see above)
- `app/forbidden/` — Shown when a user fails workspace access (403 from realtime-auth)
- `app/not-found.tsx` — 404, also what unauthorised style-guide requests render
- `app/api/` — Backend routes:
    - `realtime-auth` — issues a 60-second HMAC ticket after the membership check **and the access-window check** (see Workspace Lifecycle below), and is the only writer of `Room.last_activity_at` besides workspace-create
    - `workspaces` (+ `[workspaceId]`, `[workspaceId]/images`, `[workspaceId]/images/[imageId]`, `[workspaceId]/images/reserve`) — workspace CRUD, pasted-image upload/delete, the authorising image-serve redirect, and the PDF page-quota reservation; workspace-body validation in `workspaces/_shared.ts`, and the id/membership guards the three image routes share in `images/_shared.ts`
    - `users/batch`, `users/friends`, `users/workspaces` — user lookups; `friends` returns the caller's linked tutor-student counterparties (see below), not a general user search
    - `links` (+ `[linkId]`, `invites`, `redeem`) — tutor↔student linking: list/unlink, generate/read/revoke an invite code, redeem a code; shared validation in `_shared.ts`
    - `contact` — contact form via Resend
    - `cron/remove-unused-rooms` — deletes rooms whose `expires_at` has passed (see Workspace Lifecycle below); runs daily at 05:00 via `vercel.json` crons, authenticated with `CRON_SECRET`. Reads in batches of 500 because PostgREST caps a request at 1000 rows, and re-reads from the top each time rather than paging by offset, since deleting a room removes it from the result set. A room whose teardown throws is held aside so a batch of nothing but failures ends the drain instead of looping on it, and the whole loop stops at a 45-second budget — under Vercel's 60-second default, with the remainder still expired tomorrow
    - `cron/promote-latest` — promotes the newest staged production build to live (see Deployment below)

`proxy.ts` is the Clerk middleware: protects `/board(.*)` and `/dashboard(.*)`. `/style-guide` is deliberately **not** listed there — a middleware redirect to sign-in would advertise that the route exists, so the page gates itself and 404s instead.

### Real-Time Data Model (Cloudflare Durable Objects)

Sync runs on a Cloudflare Worker in `realtime/`, deployed separately with `wrangler`. One `BoardRoom` Durable Object per room id, addressed by `idFromName(roomId)` — created on first connect, exactly as the Liveblocks room it replaced was. The Supabase `Room` row stays the authoritative record.

**The class is exported as `BoardRoomV2`** while the source class keeps its own name. Migration `v3` deleted the original namespace outright, which was the only way to reach the objects the constructor-migrate bug had made permanent: their rooms were long gone from Supabase, and `idFromName` is one-way, so nothing could address them by name. A delete migration is illegal while any code or binding still references the class, so the replacement could not reuse the name — hence `v2` provisions `BoardRoomV2` alongside `v3`'s delete, in one deploy, so no request ever finds no namespace. Applied tags cannot be removed or edited, so the array only ever grows; another wipe would need `v4` provisioning `BoardRoomV3` beside `v5` deleting `BoardRoomV2`. The binding stays `BOARD_ROOM`, which is why no application code knows any of this happened.
The protocol is defined once in `types/realtimeTypes.ts` and imported by both sides (`realtime/tsconfig.json` maps `@/*` to the repo root). Two flat record lists, not a CRDT:

```ts
Storage (DO SQLite): strokes, images     // id PK, seq, body JSON, deleted flag
Presence (DO memory): { cursor, selection }
Identity: { connectionId, userId, info } // in ws.serializeAttachment
```

Seven ops (`types/realtimeTypes.ts`) map 1:1 onto the six mutations in `hooks/useLiveWorkspace.tsx`, plus `restoreStrokes`, which only undo uses. Never send an op from a component; go through `useLiveWorkspace`.

- **`seq` is paint order** — it reproduces the old `LiveList` insertion order, and reads are `WHERE deleted = 0 ORDER BY seq`. `updateImage` and `moveStrokes` deliberately never touch it, matching the `LiveList.set` they replaced.
- **Deletes are soft, and that is what makes undo work.** A hard delete loses `seq`, so an undone erase would come back on top of the stack instead of in its original layer — visible for highlighters and images. Tombstones are cleared when a room is opened with no other connection (nobody can hold an undo stack for it), capped at 2000 as a backstop.
- **The `seq` counter is derived from `SELECT MAX(seq)` on wake, never persisted.** A counter row per insert would roughly double rows-written, which is the first billing limit to bind.
- **The schema is created lazily and the teardown path must leave it gone.** A Durable Object ceases to exist only if its storage is empty when it shuts down, so `migrate()` runs from `ensureSchema()` on the first connect — never in the constructor, and never after `ctx.storage.deleteAll()`. Both of those were true once and both leaked: re-migrating after `deleteAll` made every deleted room's DO permanent, and migrating in the constructor meant the admin `DELETE` for a workspace that was _never opened_ conjured a Durable Object purely in order to delete it. Nothing bills much per empty room, but neither leak has a ceiling. `ensureSchema()` is called from `sendInit` and `applyOp`, which is every path that touches SQL; the "no such table" 500 it also prevents is a side effect, not the reason.
- **Ops echo back to the sender**, so the DO is the sequencer; the client reducer is "set record by id" and returns the same array identity when nothing changed. Without the echo, two concurrent `updateImage`s leave clients permanently disagreeing; without the identity check, every echo restarts the render loop.
- **Presence is in memory and recovered by resync, never by `serializeAttachment`.** That attachment caps at 16,384 bytes and a marquee over ~450 strokes of UUIDs exceeds it. On a wake from hibernation the DO broadcasts `resync-presence` and each client replays its cached presence — the cache lives in `hooks/realtime/client.ts` because `useSelectionPresence` dedupes on a signature and would never resend on its own.
- **Hibernation is load-bearing for cost**, not an optimisation: `acceptWebSocket` plus `setWebSocketAutoResponse` for ping/pong means an idle room accrues no duration charge. A plain `server.accept()` would pin it in memory and bill continuously.

Presence types are still **type aliases, not interfaces** (`types/presenceTypes.ts`). The Liveblocks JSON constraint that forced this is gone, but the shapes are shared with the Worker and aliases keep that portable.

### Selection Sharing & Locking

`Presence.selection` doubles as the display of a remote selection and the lock on it. Presence dies with the connection, so a dropped client can never strand items as unselectable.

- **Published** by `hooks/useSelectionPresence.tsx`, which polls the canvas state ref each frame and diffs a signature. Selection is mutated from three places — `pointer.ts`, `onToolChanged` in `Workspace.tsx`, and the Delete branch of `useKeybinds.tsx` — so one watcher on the shared ref beats a `ToolCallbacks` entry every mutation site has to remember to call.
- **Published bounds come off storage** (`strokes`, `pastedImagesMeta`), never off `selectorDelta` or the locally mutated `state.pastedImages`. A drag reaches storage only on pointer-up, so a box that tracked the live gesture would slide away from the strokes it frames and they would snap after it. Frozen at the committed geometry, box and content jump together on commit. The poll is per-frame rather than throttled for the same reason: the bounds change then enters the same socket flush as the storage write that caused it.
- **Consumed** by `hooks/useRemoteSelections.tsx`: fills `CanvasState.lockedStrokeIds` / `lockedImageIds` so tools reach locks through the `ToolContext` they already take, and returns a ref of `{ colour, bounds }` for the render loop (a ref, so a presence tick doesn't restart the rAF loop).
- **Enforced** in `lib/handlers/tools/pointer.ts`: locked images are filtered _out of the hit-test list_, not merely refused, so a locked image on top doesn't become a dead zone over what sits beneath it. The marquee resolution filters locked ids the same way.
- **Drawn** by `drawRemoteSelection` in `lib/canvasDrawing.ts`, last, in the owner's `getUserColour` — tune `REMOTE_SELECTION_LINE_WIDTH` / `REMOTE_SELECTION_RADIUS` there.
- A selecting user's **cursor is replaced by their name pill**, pinned to the box in `CursorLayer.tsx`. The pill deliberately has no CSS transition, unlike the cursor: the box it labels is canvas-drawn without one.
- Simultaneous marquees over the same strokes can both win — the lock is optimistic, not authoritative. Accepted: it is brief, and storage writes are last-write-wins regardless.

### Drawing Pipeline

0. `hooks/realtime/` is the sync layer. `client.ts` owns the socket — op queue, reconnect with backoff, 250 ms cursor coalescing, the presence cache used for resync, the idempotent reducers, and the undo/redo stacks. `RoomProvider.tsx` owns its lifetime; `hooks.ts` exposes `useOthers` / `useSelf` / `useUpdateMyPresence` / `useHistory` with **the same signatures the Liveblocks hooks had**, which is why the six consumer files changed only an import line. Keep those signatures if you touch them.
1. `hooks/useCanvasInput.tsx` owns every input on the `<canvas>` in `components/Workspace.tsx` and dispatches to per-tool strategies in `lib/handlers/tools/` (`pen`, `eraser`, `pointer`, `highlighter`) registered in `lib/handlers/toolStrategies.ts`. Pan is intentionally not a strategy: it is bound to the right mouse button regardless of active tool (`tools/pan.ts`).
2. All mutable interaction state (viewport/camera, in-progress stroke, selection, images) lives in a single `CanvasState` object held in one ref — see `types/canvasStateTypes.ts`. Tools receive a `ToolContext` with that state plus `ToolCallbacks` (realtime mutations) and commit on pointer-up.
3. `hooks/useCanvasRenderLoop.tsx` runs a `requestAnimationFrame` loop calling primitives in `lib/canvasDrawing.ts` to render all strokes and images.
4. Stroke points are simplified via `lib/strokeOptimisation.ts` before being stored. Hit-testing (eraser, pointer) uses `lib/genometry.ts`, which tests segments rather than points because simplification discards intermediate points.
5. Images reach the canvas through one shared path, `hooks/useInsertImage.tsx`, from two entry points: Cmd+V (`hooks/useImagePaste.tsx`, which does clipboard extraction and nothing else) and the toolbar's file picker. The picker is the only route without a keyboard, which is why it exists — iPadOS fires no `paste` event and the board's `select-none` suppresses the long-press callout. They differ only in anchor: paste drops the image's top-left at the cursor, the picker centres it in the viewport, since there is no cursor to read on a tablet. Both fit the image to at most 60% of the visible canvas (`fitToViewport` in `lib/viewport.ts`, never upscaling) and both select the new image and switch to `pointer`, so its handles are live without a second gesture. Both entry points dispatch on MIME first: a PDF goes to `hooks/useInsertPdf.tsx` instead (see PDF Insertion below).
6. Uploads go to Cloudflare R2 via `api/workspaces/[workspaceId]/images`, which returns a **path**, not a URL, and that is what lands in the room's image meta (see Image Storage & Serving below). **Everything is re-encoded to JPEG client-side, so that is the only type the route ever stores** — `ALLOWED_IMAGE_STORAGE_TYPES` in `lib/imageLimits.ts` still lists PNG so older stored objects keep agreeing. `ACCEPTED_IMAGE_INPUT_TYPES` in the same file is the wider client-only set of what a user may _hand_ the board, and `ACCEPTED_INPUT_TYPES` is that plus PDF. **The input sets must never be derived from `ALLOWED_IMAGE_STORAGE_TYPES`** — they were, and narrowing the storable set to JPEG silently stopped Cmd+V accepting the `image/png` a clipboard screenshot arrives as, with no toast because the paste listener skips an unlisted type rather than reporting it. Widening the input side costs the route nothing, since the encoder flattens all of it to JPEG first. **Unlike the Supabase bucket this replaced, R2 enforces no `allowed_mime_types` or `file_size_limit` of its own, so the route's 415 and 413 are now the only gates there are** — there is no longer a backstop that turns a mismatch into an opaque 500, but equally nothing stops a widened limit in `lib/imageLimits.ts` from taking effect immediately.
7. `prepareImageFile` in `lib/imagePrepare.ts` re-encodes **every** image before upload — never a pass-through. One encode, no search: the source is scaled into `MAX_IMAGE_WIDTH × MAX_IMAGE_HEIGHT` preserving aspect ratio, capped at 1 so nothing is upscaled, and written as JPEG at `NEXT_PUBLIC_IMAGE_QUALITY`. Output size therefore follows from those knobs alone; pick them so the result clears `MAX_UPLOAD_BYTES`, because there is no fallback ladder any more — `null` means the caller rejects the file outright. **Note PNG size tracks content, not dimensions** (a photographic PNG at 2048px is 6–9 MB), which is exactly why the output format is fixed rather than mirrored from the input. Bright images are inverted for the dark canvas in the same pass, baked into the bytes, so what is stored is what every client renders. Do not reintroduce a render-time inversion flag: it made appearance depend on `ctx.filter`, which is silently a no-op on engines that lack it. The black backfill must come **after** the inversion — laid down first it comes back white.

### Image Storage & Serving

Images live in a **private** Cloudflare R2 bucket at `{workspaceId}/{imageId}`, and `PastedImageMeta.url` holds the path `/api/workspaces/{workspaceId}/images/{imageId}` — **never a signed URL**. Every read is authorised at request time by `images/[imageId]/route.ts`, which checks the Clerk session and `Room.user_ids`, then 302s to an R2 URL presigned for **60 seconds**. The browser follows the redirect and pulls bytes straight from R2, so no image data transits Vercel.

- **Nothing persisted anywhere is a credential.** This is the whole point of the design. The previous model stored a 14-day Supabase signed URL in room storage, which meant anyone handed that link could load the image without being in the room, and rooms outliving the TTL showed broken images. Both problems are gone because the stored value grants nothing on its own.
- **`img.src` works with the bare path** because the request is same-origin and carries the Clerk cookie automatically. `proxy.ts`'s matcher runs `clerkMiddleware` on `/(api|trpc)(.*)`, which is what makes `auth()` resolve inside the route — the board pages themselves being in `isProtectedRoute` is unrelated and not sufficient.
- **The 302 is `Cache-Control: no-store`.** A cached redirect would outlive both its signature and the membership that earned it, so removing someone from a room would not bite until the browser felt like revalidating. Do not "optimise" this by caching the redirect; cache the _object_ behind it if that ever matters.
- **Presigning is a local HMAC, not a network call**, so the per-image cost is the Clerk check plus one Supabase membership query. That query is the real per-image cost — a 50-page PDF opens 50 of them. If that ever bites, cache membership in Redis briefly rather than moving the check off the read path.
- **Approach chosen over batch-presigning at room open** (the Notion/Figma model) because the document arrives over the realtime websocket, not an API response there'd be anywhere to attach signed URLs to — and because images stream in mid-session when someone else pastes, which would otherwise need a client-side signing subscription with expiry tracking and retry. This redirect model is Rails ActiveStorage's default and the OCI distribution spec's blob behaviour.
- **Expiry after load is harmless.** `usePastedImagesSync` decodes each image once into an `HTMLImageElement` the render loop draws from forever; the URL matters only at load, which is why 60 seconds is not tight.
- R2 access is wrapped in `lib/r2.ts`. Room teardown deletes by `{workspaceId}/` prefix (`deleteWorkspaceImages`), paginating the list and mapping each page to one `DeleteObjects` call, since both cap at 1000 keys.
- **The migration was a hard cut**: images uploaded before it still hold absolute Supabase URLs in their room's meta and are simply gone. There is no fallback path, and the `workspace-images` Supabase bucket is orphaned — no code touches it.

### PDF Insertion

A PDF is never stored as a PDF. `hooks/useInsertPdf.tsx` rasterises each page client-side with pdf.js and pushes them through the same encoder, upload route and image meta as any pasted image — a page on the canvas is an ordinary `PastedImageMeta` with no PDF-ness left in it, which is why hit-testing, resize, delete and remote sync all work unchanged.

- **pdf.js is imported lazily**, on the first PDF only. It is a 420 KB chunk and a lesson that never opens one should not download it. The worker is resolved with `new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url)`, which Turbopack emits under `/_next/static/media/` — already inside `proxy.ts`'s skip list.
- **The page render scale is deliberately _not_ capped at 1**, unlike `prepareImageFile`'s. A PDF page is vector, so there is no native resolution to preserve; scale 1 means 72 dpi and a blurry page. The cap belongs on bitmaps only.
- **`background: "#ffffff"` is pinned on every `page.render`** rather than left to the library default. `shouldInvert` reads mean luminance, so a transparent background reads as dark and skips the inversion every other page gets — one white sheet in a dark stack.
- **Pages stack vertically at a single scale derived from page 1**, so a file mixing page sizes stays uniform. Gap is a fraction of page height, not a world constant.
- **Selection after insert uses the marquee model** (`selectedImageIds` + `selectionBounds`), not `selectedImageId`, which holds exactly one id. The trade is no resize handles: the point of selecting a document is dragging all its pages together.
- **Rate limiting is charged once, up front.** `images/reserve` spends `pageCount` tokens against `workspace-pdf:upload` in one atomic call and returns a lease; each page upload spends the lease instead of a token. So a refusal happens before anything renders and can never strand half a document. See Rate Limiting below.
- Pages upload through a small concurrency pool and appear as each commits. A failure mid-run leaves the earlier pages placed and reports the count — deliberately, since a partial document is recoverable and a silent rollback of 40 pages is not.

### Touch, Stylus and Gestures

The canvas is driven by **Pointer Events only**. Never reintroduce a mouse or touch handler on it — Safari synthesises mouse events from pen input only after deciding the gesture is not a scroll, and suppresses the whole sequence when a contact begins soon after the last one ended. That is the cadence of handwriting, so an Apple Pencil silently lost whole letters while a slow straight line worked fine.

- **`touch-action: none` on the canvas is load-bearing**, not cosmetic. Without it Safari withholds pointer events while it evaluates the gesture, then fires `pointercancel` mid-stroke.
- **The `touchstart`/`touchmove` `preventDefault` listeners are not redundant with `touch-action`, and deleting them breaks the Apple Pencil.** iOS derives its pointer events from touch events, and `preventDefault()` on a `PointerEvent` never reaches the touch gesture underneath. Without them Safari resolves a quick Pencil drag as a _text selection_, raises its Copy/Look Up callout, and hands the stroke back as a `pointercancel` — which reads as "fast handwriting drops random letters". They must stay `{ passive: false }`. `gesturestart`/`gesturechange` are suppressed alongside for Safari's own pinch.
- **`select-none` sits on the whole board tree, not just the canvas**, because iOS anchors that callout to any selectable text near the gesture. The header's title `<input>` stays editable regardless — `user-select: none` on an ancestor does not disable form fields.
- **`pointercancel` commits the stroke rather than discarding it.** A cancel is the browser taking the gesture away, not the user changing their mind; that case is caught at pointer-down instead. Half a letter beats a letter that vanishes.
- **Pen-priority palm rejection.** Once a `pen` pointer is seen, touch contacts never draw again for the life of the page, and a single finger becomes inert — panning is strictly two-finger. Before the first pen contact there is nothing to reject a palm by, so a pen landing mid-touch-stroke discards that stroke; that covers the one case `penSeen` cannot.
- **A second contact discards the gesture in flight** and becomes a pinch. `abortPointerGesture` in `tools/pointer.ts` puts back what was moved — nothing has reached storage yet, which is why a local revert is the whole job. `imageTransformOrigin` exists solely so a single-image drag or resize can be reverted this way.
- **The pinch pins the world point under the opening two-finger midpoint** to the live midpoint. That yields pan and zoom in one expression with no rotation term, and keeps panning alive once zoom clamps. Zoom limits and anchoring are shared with the wheel through `lib/viewport.ts` — put any new zoom entry point there rather than duplicating the clamp.
- **Pointer moves are replayed through `getCoalescedEvents()`.** A Pencil reports far faster than the display refreshes and the dropped samples are exactly the curve of a letter, so pen, highlighter and pointer moves are deliberately unthrottled. Only the eraser is gated, because it filters every stroke and mutates storage per move.
- **`setPointerCapture` on the drawing pointer** is what lets a stroke that ends off the edge of the screen still commit.
- **`crypto.randomUUID` is secure-context-only** and absent over a plain-HTTP LAN address, which is how the board gets tested from an iPad. Use `newId()` from `lib/id.ts` on the client; the server may call `randomUUID` directly.
- **Hit targets are screen pixels divided by zoom**, not world constants — a world-space handle shrank to a hairline zoomed out. See `DRAG_HIT_PADDING` / `MIN_DRAG` in `tools/pointer.ts`, `HANDLE_SIZE` in `lib/imageUtils.ts` (the hit box, sized for a fingertip) and in `lib/canvasDrawing.ts` (the smaller drawn box).
- **Never write `style.width`/`style.height` on the canvas.** It overrides the sizing classes and pins `clientWidth` to a literal, after which the element never resizes — on an iPad, rotation stops working. `lib/canvasDrawing.ts` sets the backing store only; CSS owns the box.
- `app/board/[boardId]/page.tsx` carries its own `viewport` export with `maximumScale: 1` so a pinch that misses the canvas cannot scale the page. It is board-only on purpose — browser zoom stays available everywhere else.

### Component Structure

```
components/
  ui/                     ← shared shadcn primitives, restyled onto the tokens
  styleGuide/             ← the admin style guide page (see Design System)
  Workspace.tsx           ← root canvas component; owns CanvasState ref, tool state, pan/zoom
    ├─ BoardHeader.tsx    ← host identity + inline-editable workspace title
    ├─ Toolbar.tsx        ← left toolbar (tools, colour fans via ToolbarButton/ColourSelector,
    │                       undo/redo, and the hidden image/PDF input behind Add image)
    ├─ ParticipantRoster  ← who's in the room (from Presence/others)
    ├─ CursorLayer.tsx    ← renders other users' cursors from Presence
    ├─ SelectionActions   ← delete button pinned under the selection box; the
    │                       only route to delete without a keyboard
    └─ FullscreenLoader   ← shown until the room's first init completes
  ConnectionNotice        ← held-open toast while the socket is down; strokes
                            keep committing locally behind it
  dashboard/
    DashboardClient.tsx   ← data fetching, filter state, role gating
      └─ DashboardShell   ← Sidebar (md+) / Navbar + TabBar swap, and the content column
           ├─ Sidebar.tsx      ← identity, Menu, then a one-button Actions section (see Dashboard
           │                     Actions below); mounts whichever modal that action needs
           ├─ Next.tsx         ← the next upcoming lesson
           ├─ Filters.tsx      ← search + collaborator filters
           ├─ WorkspaceLists   ← upcoming/past tabs
           │    └─ WorkspaceTable + WorkspaceTableRow (+ RowActionsMenu, PeopleStack)
           ├─ WorkspaceModal   ← create/edit, steps in workspaceModalSteps/
           ├─ mobile/          ← the sub-md surface: TabBar (bottom nav + a floating button
           │                     carrying the same one action), WorkspaceList/WorkspaceRow
           │                     + WorkspaceDetailSheet, ConnectionsList/ConnectionRow,
           │                     FiltersSheet
           ├─ connections/     ← app/dashboard/connections: ConnectionsClient, ConnectionsTable +
           │                     ConnectionRow, LinkCodeDialog (generate/redeem tabs), InviteCountdown
           └─ skeletons/       ← loading states mirroring the real layouts, mobile and desktop
  home/                   ← Navbar (shared with dashboard/legal), hero CTAs
  policy/PolicyDocument   ← renders data/policies/*.json
  changelog/ChangelogDocument ← renders data/changelog.json
  inlineMarkup.tsx        ← the [label](url) / **bold** / {{CONTACT_EMAIL}} pass
                            both of the above share
```

Keyboard shortcuts (undo/redo, delete selection, etc.) live in `hooks/useKeybinds.tsx`.

### Dashboard Actions

The dashboard offers **at most one action per page**, derived from route × role in `lib/dashboardActions.ts` and rendered by the `Sidebar`'s Actions section at `md+` and the `TabBar`'s floating button below it.

|         | `/dashboard`     | `/dashboard/connections` |
| ------- | ---------------- | ------------------------ |
| tutor   | Create workspace | Add a student            |
| student | —                | Add a tutor              |
| admin   | —                | —                        |

- **One home per tier.** No page renders its own action button; both surfaces read the same helper. The rule used to be written out in each of them, which is how one action came to be called both "Add New Student" and "Link a student".
- **Absent, not disabled, when the page can't land the result.** Each page passes only the callback its own action needs — `/dashboard` passes `onCreated`, connections passes `onLinked` — and the button (plus its modal) is omitted otherwise. Greying it out instead is what put a dead "Create Workspace" on the connections page.
- Menu items use `opacity-25` for "not for your role"; an unbuilt destination carries a `Soon` badge instead, and the dimming sits on the icon and label rather than the row so the badge stays legible.

### Responsive Model (dashboard)

The dashboard is **mobile-first with a single layout seam at `md`**. Below it, the phone layout; at `md` and above, the desktop layout described throughout this file. A portrait tablet therefore gets the desktop tree.

`lg` still appears in the dashboard, but it is a **second, narrower seam that decides one thing: how wide the sidebar starts.** Keep the two apart — a `lg:` added for layout reintroduces the tablet gap this seam was moved to close.

- Breakpoint swaps are **CSS-only** (`md:hidden` / `hidden md:block`), never a media-query hook: both trees mount, which avoids hydration mismatch and first-paint flash, and lets each tree keep behaviour the other doesn't have.
- **Nothing below `md` links to `/board`.** The canvas is desktop-only for now and this is enforced by omitting every link — the `Next` card is inert, rows open a detail sheet, and "Join workspace" is absent from the mobile actions. There is no route guard; opening a board URL directly still works.
- **A tablet clears `md`, so the desktop tree must not assume a mouse.** Anything readable only on hover needs a tap path: `components/TapTooltip.tsx` keeps hover on a fine pointer and adds tap-to-open on a coarse one, decided per interaction from `pointerType` rather than a media query. Plain `Tooltip` is still fine for a label naming an action its trigger already performs.
- **The desktop workspace row does not open the board on click.** Joining goes through the row's `⋯` menu or the `Next` card, so a stray tap on a tablet can't drop someone into a lesson.
- Each table has a mobile counterpart in `components/dashboard/mobile/`: a compact row list whose rows open a `Sheet` holding the detail and actions that depend on hover at desktop.
- The `Sidebar`'s Actions are unreachable below `md`, so `TabBar` carries them on a floating action button, picking one action from the current page and role. In the rail they survive as an icon-only button with a tooltip (see Sidebar Collapse below).
- Bottom-flush chrome uses the `.pb-safe` utility (see `app/globals.css`), which needs `viewportFit: "cover"` from `app/layout.tsx`.

### Sidebar Collapse

The sidebar is either a `w-17` icon rail or a `w-75` panel, and which one is **tri-state**: `lib/sidebarCookie.ts`'s `CollapseState` is `true` (rail), `false` (panel) or `null` (no cookie yet). Every consumer goes through `byCollapseState(collapsed, rail, panel, auto)` in `components/dashboard/sidebarCollapse.ts`, which picks a class string per state; `DashboardShell` holds the state and publishes it plus `toggle` on a context.

- **`null` is not a third look, it is "let CSS decide"** — the `auto` argument is always a breakpoint pair (`w-17 lg:w-75`, `hidden lg:block`, `-rotate-90 lg:rotate-90`), so an untouched sidebar is a rail on a tablet and a panel on a desktop, from one server-rendered markup with no media-query hook and no flash. This is the **only** place `lg` means anything in the dashboard.
- **The cookie is written only by `toggle`**, and from then on the state is absolute at every width: a user who collapsed it on a desktop still gets a rail on their phone-sized window. Deliberate — an explicit choice outranks the width heuristic.
- **`toggle` resolves `null` by reading `matchMedia("(min-width: 64rem)")`**, i.e. by asking what the auto CSS is currently showing, so the first click always flips what the user can see. That literal must track the `lg` in the auto strings; Tailwind's breakpoints are stock, so `lg` is 64rem.
- **Read server-side** by `lib/serverSidebarCookie.ts` and passed as `initialCollapsed`, so the first paint is already the right width. The cookie is scoped to `Path=/dashboard`.
- Rail state hides every label, so anything added to the sidebar needs a `RailTooltip` alongside it or it becomes an unlabelled icon.

### Access Control & Roles

Two distinct concepts:

- **Account role** — `student | tutor | admin`, stored in Clerk `publicMetadata.role`. The three are **mutually exclusive and confer separate privileges**; neither tutor nor admin is a superset of the other. `lib/roles.ts` defines them and parses the stored value (failing closed to `student`). Server-side: `lib/serverRole.ts` (`getUserRole`, plus `requireTutor` / `requireAdmin` guards for API routes — each demands its exact role, so `requireTutor` rejects an admin — and `requireLinkRole`, which returns `"student" | "tutor"` or a 403, for the bidirectional invite-code flow). Client-side: `hooks/useUserRole.tsx`.
    - `student` — the default. Joins workspaces they were invited to; can link to tutors and see their linked tutors at `/dashboard/connections`.
    - `tutor` — creates, edits and deletes workspaces; can link to students and see their linked students. The workspace collaborator picker (`CollaboratorsPicker`) only ever offers linked students — `/api/users/friends` is strictly the caller's linked counterparties, not a general user search.
    - `admin` — internal tooling only (currently `/style-guide`). No product privileges, including linking — an admin can hold no tutor-student links. Don't widen a tutor-gated route to admins to make internal tooling easier.
- **Workspace host** — the creator of a workspace (`Workspace.host`), the only member allowed to edit it. Helpers in `lib/workspaceHost.ts`.
- **Tutor-student links** — a separate relation from workspace membership, stored in Supabase `tutor_links` (positional `tutor_id`/`student_id`, not role-stamped) and formed by redeeming a 10-minute invite code (`link_invites`). Either side can remove a link; removing one also strips the student from the tutor's future-dated rooms (`lib/unlinkRooms.ts`) and evicts their live sockets from those rooms. See `lib/links.ts`, `lib/inviteCode.ts`, `app/api/links/`.

**Revocation reaches a connected user**, because membership is otherwise only checked when a socket opens. `evictRoomMembers` in `lib/realtimeAdmin.ts` posts to the Worker's secret-gated `POST /rooms/:id/evict?userId=`, which closes that user's sockets in the room's DO with code 1008. Two callers: the unlink cascade above, and the workspace PATCH, which diffs the old `user_ids` against the new one so an edit that drops a collaborator behaves the same. Workspace deletion needs neither — the DO's `DELETE` closes every socket itself.

- **Order is load-bearing: Supabase first, then evict.** The close is what triggers the client's reconnect, and a reconnect while the row still lists them mints a fresh ticket and lets them straight back in.
- **The call is best-effort and never fails its caller** — it reports through `reportError` and returns. The row is already correct, so a Worker outage costs one stale session rather than a failed unlink or a failed save.
- **No client change was needed.** `client.ts` ignores the close code and reconnects, `/api/realtime-auth` 403s, and `RoomProvider` pushes to `/forbidden`. If you ever want a message first, that is where to branch on 1008.

`useUserRole` returns `student` until Clerk hydrates, so anything privileged must also gate on `isLoaded` or take a server-resolved role as a prop (`app/dashboard/page.tsx` resolves it and passes it to `DashboardClient`/`Sidebar` for this reason).

`app/api/realtime-auth/route.ts` gates room access: checks Supabase to confirm the authenticated Clerk user is in the room's `user_ids` array, then that the room is inside its access window, before signing a ticket. Returns 403 otherwise (client redirects to `/forbidden`). Membership failure returns a bodyless 403 so a non-member learns nothing; a **member** outside the window gets `{ reason }`, which `client.ts` reads and `RoomProvider` forwards as `/forbidden?reason=`.

- The ticket is a 60-second HMAC-SHA256 JWS over `{ sub, room, info, iat, exp }`, signed in `lib/realtimeTicket.ts` and verified in `realtime/src/ticket.ts` against a shared `REALTIME_TICKET_SECRET`. It authorises **exactly one room**, so a member of one room cannot replay their ticket into another.
- **It travels as a websocket subprotocol, not a query parameter** — `new WebSocket(url, ["chalkie.v1", ticket])` — so it never lands in a URL or an access log. Two things this depends on: the DO must echo `Sec-WebSocket-Protocol: chalkie.v1` on its 101 or Chrome fails the handshake, and base64url plus `.` are all valid RFC 7230 `tchar`s so a JWS is header-safe.
- **The Worker forwards the original `Request`, never a rebuilt one.** A fresh `Request` drops `Upgrade: websocket` and the runtime then refuses to return a socket at all. Identity is added as `x-chalkie-user` / `x-chalkie-info` headers on a copy, and the ticket header is stripped before the DO sees it.
- Verification happens in the Worker, not the DO, so a forged or expired ticket costs one Worker request and never wakes a Durable Object.

### Workspace Lifecycle

A workspace is openable only inside a window derived from its `start_time`, and is deleted in full — Durable Object, R2 images and the Supabase row — once that window closes. `lib/workspaceLifecycle.ts` is the single source of truth and is imported by the API routes and the dashboard alike; nothing else may compute these boundaries.

Two derived columns carry it, both written **only** by workspace-create and workspace-PATCH:

```
opens_at   = start_time − leadMs        (null when start_time is null)
expires_at = start_time + retentionMs   (creation time when start_time is null)
```

- **The deadline is stored, not derived at query time, because both durations are paid-plan variables.** `limitsForPlan()` returns `{ leadMs: 1h, retentionMs: 14d }` for every account today. When tiers land, the host's plan is looked up in those two write paths and passed in — the cron stays one indexed `.lt("expires_at", now)` however many tiers exist, and a plan change becomes a recompute of that host's rows. Do not move the arithmetic into the cron; that reintroduces a per-room plan lookup on a 500-row batch.
- **A NULL `expires_at` is invisible to the cron** (Postgres `lt` excludes NULL), which is what makes the columns safe to add ahead of any backfill. It also means a row that somehow escapes both write paths is immortal — if the DB-side `upsert_room` RPC is ever changed to insert rather than update, it must set `expires_at`.
- **No start time means no access and a same-night deletion.** `expires_at` is set to the creation time, so the next 05:00 run sweeps it. The modal warns on both the Schedule and Review steps.
- **The lock reads the stored `opens_at`, never the incoming value.** Once a workspace has opened its start time is frozen; PATCH 409s on a change. It must compare *parsed instants* against the stored `start_time` and let an unchanged value through — `WorkspaceModal` sends all five fields on every save, so a value comparison is the only thing that lets a locked workspace's feedback still be edited. `sameInstant` exists for this; string equality fails because the modal round-trips through `toISOString()` and Postgres returns a different format.
- **A start time inside the lock window is allowed**, so an ad-hoc "lesson now" works. The modal confirms first, since the resulting workspace is immediately locked and can only be undone by deleting it.
- **Deletion is indifferent to activity.** `last_activity_at` is still written by `realtime-auth` but no longer drives anything; a room drawn in on day 13 still dies on day 14, feedback included. That determinism is what makes the window priceable.
- `lifecyclePhase` / `lifecycleStatus` / `joinDenialLabel` drive the dashboard's Status column, its disabled Join action and the mobile row dot, so all three agree by construction. They take `now` as an argument rather than reading the clock, and the dashboard feeds them `hooks/useNow.tsx` on a 60-second tick — `DashboardClient` previously froze `now` at mount, so no boundary ever advanced on an open page.

### Changelog & Version

`data/changelog.json` is the only place a version number is written. It is `{ title, currentVersion, intro?, entries[] }`, where each entry is `{ version, date, changes[] }` and a change is either a bare string or `{ tag, text }` with `tag` one of `Added | Fixed | Changed | Removed`. `components/changelog/ChangelogDocument.tsx` renders it at `/changelog`, reusing the policy pages' inline markup and the `Badge` primitive's variants for the tags — no colours of its own.

- **Entries render in file order**, so author the newest at the top. Nothing sorts or parses `version`; the anchor id is just the version slugified.
- **`currentVersion` feeds the app's version tag.** `next.config.ts` reads it and exposes it as `NEXT_PUBLIC_VERSION`, which is what the dashboard `Sidebar` prints. Config `env` wins over a `.env` file, so any leftover `NEXT_PUBLIC_VERSION` there is inert — delete it rather than trusting it.
- **That indirection is deliberate.** The `Sidebar` is a client component, and a JSON import from one bundles the whole file: importing the changelog to read a single string shipped every release note to every dashboard visitor. Do not "simplify" this back into a `lib/` module that imports the JSON.
- Being build-time inlined, a version bump needs a rebuild — already true, since `/changelog` is statically prerendered.
- `app/sitemap.ts` lists the page with `lastModified` taken from the newest entry's date, parsed by the same UTC-safe helper the policies use.

### Deployment (staged, promoted nightly)

**The realtime Worker deploys on a different clock to the app.** `wrangler deploy` is immediate; a push to `main` sits `STAGED` until promoted. A protocol change therefore goes live against a client that may not speak it for up to a day unless the Vercel build is force-promoted in the same window. There is no version negotiation — the Worker speaks exactly one protocol, and `chalkie.v1` is a label rather than a compatibility mechanism.

Pushes to `main` build but **do not go live**. The Vercel project has **Auto-assign Custom Production Domains** turned off (Project Settings → Environments → Production → Branch Tracking), so each push produces a production deployment in the `STAGED` substate serving no traffic. `app/api/cron/promote-latest` promotes the newest staged build overnight, so a mid-afternoon push can't interrupt a lesson in progress.

- Scheduled `0 0 * * *` in `vercel.json`. Vercel cron expressions are UTC-only and DST-blind, and Hobby-plan crons only fire to within the hour, so the real window is roughly 00:00–02:00 UK local depending on the season. That imprecision is accepted deliberately — it is all outside tutoring hours, and pinning it tighter costs a second cron entry and a DST guard for no practical gain.
- Crons invoke the **currently live** deployment, i.e. the one _before_ whatever is about to be promoted. Changes to `promote-latest` itself only take effect the night after they go live, and the first deploy containing the route has to be promoted by hand once to bootstrap it.
- Vercel API access lives in `lib/vercelDeployments.ts`. Promotion is an alias swap, not a rebuild.
- **`readySubstate === "STAGED"` is not "waiting to go live" — it is permanent for every push that was never promoted.** Push three times in a day and that night's run promotes the newest, leaving two candidates that never expire; a later night with nothing new then promotes one of _those_, walking production backwards a commit per night. So the newest staged build is only promotable if it is **newer than the live one**, read from `targets.production` on `/v9/projects/{id}` (`fetchLiveProductionDeployment`). Never gate on the substate alone.
- To ship something urgently, promote by hand in the dashboard; the cron then finds nothing newer than live and no-ops.

### Rate Limiting

`lib/ratelimit.ts` is the single source of truth: a `RATE_LIMITS` table mapping each route key to `{ keyBy: "userId" | "ip", limit, window }`, enforced via Upstash sliding window (`enforceRateLimit` returns a 429 Response or null). Fail-open if Upstash is unreachable, with the outage reported. Every API route calls this before doing work.

`enforceRateLimit` takes an optional `cost`, passed through as `limit(id, { rate: cost })` — supported by `slidingWindow`, whose Lua script takes an `incrementBy`. It buys a whole batch in one decision, so the caller gets all of it or none: a PDF learns it is over budget before rendering a page, rather than dying halfway through.

**PDF page uploads spend a lease, not a token** (`lib/pdfLease.ts`). `images/reserve` charges `pageCount` against `workspace-pdf:upload` and writes a Redis counter keyed `chalkie:pdflease:{userId}:{workspaceId}:{leaseId}`; each page upload sends that id in an `x-pdf-lease` **header** and the route spends it with a single atomic `DECR`.

- **Identity lives in the key, never the value.** `userId` comes from Clerk and `workspaceId` from the URL, so a forged or borrowed `leaseId` addresses a key that was never created, `DECR` returns `-1`, and it reads as exhausted. `DECR` also conjures that key with no TTL, so the miss branch deletes it.
- **A header, not a form field**, so the route can decide before parsing the body — otherwise the limiter would have to run after `req.formData()`.
- **An invalid lease falls through to `workspace-image:upload`**, never to an error. The worst outcome is being charged per page like a plain paste.

### Error Handling

`lib/errorResponse.ts` — `reportError` logs to console and persists to the Supabase `error_logs` table; `errorResponse` is the single chokepoint for API catch branches, returning a consistent `{ error }` JSON shape. Use these instead of raw `console.error` in API routes.

### Key Type Definitions (`types/`)

- `strokeTypes.ts` — `Point`, `Stroke { id, points[], colour, highlight? }`
- `imageTypes.ts` — `PastedImageMeta` (position/size), `PastedImage` (meta + loaded element), `ResizeHandle`
- `toolTypes.ts` — `Tools: "pen" | "eraser" | "pointer" | "highlighter"` + per-tool cursor map. There is no `selector`: the marquee lives inside `pointer`
- `canvasStateTypes.ts` — `CanvasState`, `Viewport`, `ToolContext`, `ToolCallbacks`, `ToolStrategy`
- `presenceTypes.ts` — `SelectionPresence` (the Presence payload), `RemoteSelection` (what the renderer draws)
- `realtimeTypes.ts` — the wire protocol shared with the Worker: `Op`, `ClientMessage`, `ServerMessage`, `Presence`, `TicketClaims`. Keep it free of DOM types; the Worker cannot load the DOM lib alongside `@cloudflare/workers-types`
- `userTypes.ts` — `UserRole`, `userInfo`, `Workspace` (including `opensAt`/`expiresAt`), `WorkspaceEditData`
- `linkTypes.ts` — `LinkRole`, `TutorLinkRow`/`LinkInviteRow` (raw Supabase shapes), `LinkInvite`/`LinkSummary` (client-facing shapes)
- `policyTypes.ts` — `PolicyDocument`/`PolicySection`/`PolicyBlock` for the legal pages, including the supported inline markup
- `changelogTypes.ts` — `ChangelogDocument`/`ChangelogEntry`/`ChangelogChange`/`ChangeTag` for `data/changelog.json`

### Shared Helpers (`lib/`)

Beyond the modules described above: `colours.ts` (pen/highlighter palettes), `userColour.ts` (deterministic per-user identity colour), `textUtils.ts` (relative/countdown/session time formatting), `imageUtils.ts` (image hit-testing and resize handles), `imageLimits.ts` (the storable MIME set and byte cap shared with the images route and matched by the storage bucket, the wider client-only input set, and the PDF page cap), `imagePrepare.ts` (decode, then re-encode every image once into the configured box as JPEG, inverting bright ones), `imageUpload.ts` (the upload/lease-reserve calls and the local-state adopt/rollback steps, shared by the image and PDF insert paths), `r2.ts` (the R2 client and every put/delete/prefix-delete/presign against it — see Image Storage & Serving above), `realtimeTicket.ts` (signs the 60-second websocket ticket — see Access Control above), `realtimeAdmin.ts` (the secret-gated calls into the Worker: room teardown and member eviction — see Access Control above), `pdfLease.ts` (the pre-paid page quota — see Rate Limiting above), `id.ts` (`newId` — client-side ids, see Touch above), `viewport.ts` (zoom clamps, the shared anchor rule, and insert placement/fit), `deleteSelection.ts` (shared by the Delete keybind and the on-canvas button), `dashboardFilters.ts` / `dashboardTableColumns.ts` / `connectionsTableColumns.ts` / `dashboardCounterparty.ts` (dashboard list logic), `dashboardActions.ts` (the route × role → single action rule shared by `Sidebar` and `TabBar` — see Dashboard Actions above), `sidebarCookie.ts` / `serverSidebarCookie.ts` (the tri-state sidebar width and its cookie — see Sidebar Collapse above), `deleteWorkspace.ts` (tears down the Durable Object, R2 images and the Supabase row in a recoverable order), `workspaceLifecycle.ts` (plan limits, the `opens_at`/`expires_at` derivation, the access and lock predicates, and the phase→badge mapping — see Workspace Lifecycle above), `workspaceMapping.ts` (`mapRoomRow`, the one snake→camel `Room` mapping, shared by `DashboardClient` and `WorkspaceModal`), `clerkAppearance.ts` (Clerk theming), `clerkUsers.ts` (`fetchUserProfiles` — the one place Clerk ids get turned into `userInfo`; guards the empty-array-returns-everyone Clerk API footgun), `inviteCode.ts` (invite code alphabet/generation/normalisation), `links.ts` (`tutor_links` queries), `unlinkRooms.ts` (the unlink-cascade helper — see Access Control above), `supabase/admin.ts` (service-role client), `vercelDeployments.ts` (Vercel REST API wrapper for the staged-deployment promotion flow — see Deployment above).

### Path Alias

`@/*` maps to the repo root (configured in `tsconfig.json`).
