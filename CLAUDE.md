# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
Always address me by name at the beginning of a responce (Harrison).
Always interview and never make blind assumptions.
Give all plans concisely.

## Project Overview

ChalkieChalkie is a real-time collaborative whiteboard application for tutoring. Tutors schedule lessons (workspaces) with students, and multiple users can draw, highlight, erase, select/move, and paste images on a shared canvas simultaneously.

**Core tech stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui on Radix primitives, Liveblocks (real-time sync), Clerk (auth), Supabase (PostgreSQL + image storage), Upstash Redis (rate limiting), Resend (contact emails), sonner (toasts), lucide-react (icons), motion (animation).

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test suite exists in this project.

## Required Environment Variables

Create `.env.local` with:

- `NEXT_PUBLIC_LIVE_BLOCKS_API_KEY`, `LIVEBLOCKS_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`
- `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
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

A comment explains **why**, never **what**. The code already says what it does; restating it is noise that goes stale.

- **Default to none.** Reach for a clearer name or a smaller function first. Most code needs no comment at all.
- **One or two lines.** If a reason needs a paragraph, it belongs in this file or the commit message, not above the code. Never write a file-header essay.
- **Never narrate.** Delete on sight: `// fetch the user`, `// tutor-only action`, `// render pen strokes`, `// ─── DOWN ───` banners, and JSDoc that restates a function's name or its parameter names.
- **Record the trap, not the tour.** A comment earns its place only when it holds something the code cannot: a non-obvious ordering constraint, a platform footgun, a rejected alternative, a deliberate omission. Example: `// Two queries, not one .or(): ISO dots collide with PostgREST's operator separator and mis-parse silently.`
- **Don't restate CLAUDE.md.** If it is documented here, a file-header copy just drifts out of sync with it.
- **Explain in the CLI, not the file.** If a change needs walking through, say it in your response. Don't leave the explanation behind in the source.
- **`TODO:` is exempt** from why-only, but keep it to the actionable sentence.

When editing a file that still carries old prose, trim it as you pass.

## Architecture

### Route Structure

- `app/(home)/` — Public landing page (hero, beta sign-up, contact) with its own `Navbar` + `Footer` layout
- `app/(legal)/` — `privacy-policy`, `terms-of-service`, `cookie-policy`; content authored as JSON in `data/policies/` and rendered by `components/policy/PolicyDocument.tsx`
- `app/dashboard/` — Authenticated dashboard: upcoming/past lessons, filters, workspace create/edit modal (`components/dashboard/`)
- `app/dashboard/connections/` — Tutor↔student linking: "Your Students" (tutor) / "Your Tutors" (student), invite-code exchange in a Dialog (`components/dashboard/connections/`)
- `app/board/[boardId]/` — The whiteboard canvas page; wraps `<Workspace>` in a Liveblocks `<Room>` provider (`Room.tsx`)
- `app/sign-in/` — Clerk sign-in page (styled via `lib/clerkAppearance.ts`)
- `app/style-guide/` — Admin-only design system reference (see above)
- `app/forbidden/` — Shown when a user fails workspace access (403 from liveblocks-auth)
- `app/not-found.tsx` — 404, also what unauthorised style-guide requests render
- `app/api/` — Backend routes:
  - `liveblocks-auth` — issues Liveblocks tokens after membership check
  - `workspaces` (+ `[workspaceId]`, `[workspaceId]/images`, `[workspaceId]/images/reserve`) — workspace CRUD, pasted-image upload/delete, and the PDF page-quota reservation; shared validation in `_shared.ts`
  - `users/batch`, `users/friends`, `users/workspaces` — user lookups; `friends` returns the caller's linked tutor-student counterparties (see below), not a general user search
  - `links` (+ `[linkId]`, `invites`, `redeem`) — tutor↔student linking: list/unlink, generate/read/revoke an invite code, redeem a code; shared validation in `_shared.ts`
  - `contact` — contact form via Resend
  - `cron/remove-unused-rooms` — deletes rooms inactive >2 weeks; runs daily at 05:00 via `vercel.json` crons, authenticated with `CRON_SECRET`
  - `cron/promote-latest` — promotes the newest staged production build to live (see Deployment below)

`proxy.ts` is the Clerk middleware: protects `/board(.*)` and `/dashboard(.*)`. `/style-guide` is deliberately **not** listed there — a middleware redirect to sign-in would advertise that the route exists, so the page gates itself and 404s instead.

### Real-Time Data Model (Liveblocks)

Defined in `liveblocks.config.ts`:

```ts
Storage: {
  canvasStrokes: LiveList<Stroke>        // All drawing strokes
  pastedImages: LiveList<PastedImageMeta> // Pasted images with position/size
}
Presence: {
  cursor: { x: number; y: number } | null       // Live cursor position per user
  selection: SelectionPresence | null           // { strokeIds, imageIds, bounds } — committed geometry, see below
}
UserMeta: { id, info: { firstName, lastName, imageUrl, email } } // set server-side at auth
```

All mutations (add/delete/move strokes, add/move/resize images) go through hooks in `hooks/useLiveWorkspace.tsx`. Never mutate Liveblocks storage directly from components.

Presence types must be **type aliases, not interfaces** (`types/presenceTypes.ts`) — Liveblocks' JSON constraint needs the implicit index signature only aliases carry, and an interface fails with a string-literal "not a valid JSON object" type error rather than anything readable.

### Selection Sharing & Locking

`Presence.selection` doubles as the display of a remote selection and the lock on it. Presence dies with the connection, so a dropped client can never strand items as unselectable.

- **Published** by `hooks/useSelectionPresence.tsx`, which polls the canvas state ref each frame and diffs a signature. Selection is mutated from three places — `pointer.ts`, `onToolChanged` in `Workspace.tsx`, and the Delete branch of `useKeybinds.tsx` — so one watcher on the shared ref beats a `ToolCallbacks` entry every mutation site has to remember to call.
- **Published bounds come off storage** (`strokes`, `pastedImagesMeta`), never off `selectorDelta` or the locally mutated `state.pastedImages`. A drag reaches storage only on pointer-up, so a box that tracked the live gesture would slide away from the strokes it frames and they would snap after it. Frozen at the committed geometry, box and content jump together on commit. The poll is per-frame rather than throttled for the same reason: the bounds change then enters the same socket flush as the storage write that caused it.
- **Consumed** by `hooks/useRemoteSelections.tsx`: fills `CanvasState.lockedStrokeIds` / `lockedImageIds` so tools reach locks through the `ToolContext` they already take, and returns a ref of `{ colour, bounds }` for the render loop (a ref, so a presence tick doesn't restart the rAF loop).
- **Enforced** in `lib/handlers/tools/pointer.ts`: locked images are filtered *out of the hit-test list*, not merely refused, so a locked image on top doesn't become a dead zone over what sits beneath it. The marquee resolution filters locked ids the same way.
- **Drawn** by `drawRemoteSelection` in `lib/canvasDrawing.ts`, last, in the owner's `getUserColour` — tune `REMOTE_SELECTION_LINE_WIDTH` / `REMOTE_SELECTION_RADIUS` there.
- A selecting user's **cursor is replaced by their name pill**, pinned to the box in `CursorLayer.tsx`. The pill deliberately has no CSS transition, unlike the cursor: the box it labels is canvas-drawn without one.
- Simultaneous marquees over the same strokes can both win — the lock is optimistic, not authoritative. Accepted: it is brief, and storage writes are last-write-wins regardless.

### Drawing Pipeline

1. `hooks/useCanvasInput.tsx` owns every input on the `<canvas>` in `components/Workspace.tsx` and dispatches to per-tool strategies in `lib/handlers/tools/` (`pen`, `eraser`, `pointer`, `highlighter`) registered in `lib/handlers/toolStrategies.ts`. Pan is intentionally not a strategy: it is bound to the right mouse button regardless of active tool (`tools/pan.ts`).
2. All mutable interaction state (viewport/camera, in-progress stroke, selection, images) lives in a single `CanvasState` object held in one ref — see `types/canvasStateTypes.ts`. Tools receive a `ToolContext` with that state plus `ToolCallbacks` (Liveblocks mutations) and commit on pointer-up.
3. `hooks/useCanvasRenderLoop.tsx` runs a `requestAnimationFrame` loop calling primitives in `lib/canvasDrawing.ts` to render all strokes and images.
4. Stroke points are simplified via `lib/strokeOptimisation.ts` before being stored. Hit-testing (eraser, pointer) uses `lib/genometry.ts`, which tests segments rather than points because simplification discards intermediate points.
5. Images reach the canvas through one shared path, `hooks/useInsertImage.tsx`, from two entry points: Cmd+V (`hooks/useImagePaste.tsx`, which does clipboard extraction and nothing else) and the toolbar's file picker. The picker is the only route without a keyboard, which is why it exists — iPadOS fires no `paste` event and the board's `select-none` suppresses the long-press callout. They differ only in anchor: paste drops the image's top-left at the cursor, the picker centres it in the viewport, since there is no cursor to read on a tablet. Both fit the image to at most 60% of the visible canvas (`fitToViewport` in `lib/viewport.ts`, never upscaling) and both select the new image and switch to `pointer`, so its handles are live without a second gesture. Both entry points dispatch on MIME first: a PDF goes to `hooks/useInsertPdf.tsx` instead (see PDF Insertion below).
6. Uploads go to Supabase storage via `api/workspaces/[workspaceId]/images`, which returns a signed URL stored in Liveblocks meta. **Everything is re-encoded to JPEG client-side, so that is the only type the route ever stores** — `ALLOWED_IMAGE_TYPES` in `lib/imageLimits.ts` still lists PNG so older stored objects and the bucket keep agreeing. `ACCEPTED_INPUT_TYPES` in the same file is the wider client-only set of what a user may *hand* the board, PDF included. **The `workspace-images` bucket enforces its own `allowed_mime_types` and `file_size_limit`, and neither may be tighter than `lib/imageLimits.ts`** — the bucket rejects after the route's own gates have passed, so the difference surfaces as an opaque 500 instead of a 413 the user can read. A PNG-only bucket is what made every JPEG fail while PNGs worked.
7. `prepareImageFile` in `lib/imagePrepare.ts` re-encodes **every** image before upload — never a pass-through. One encode, no search: the source is scaled into `MAX_IMAGE_WIDTH × MAX_IMAGE_HEIGHT` preserving aspect ratio, capped at 1 so nothing is upscaled, and written as JPEG at `NEXT_PUBLIC_IMAGE_QUALITY`. Output size therefore follows from those knobs alone; pick them so the result clears `MAX_UPLOAD_BYTES`, because there is no fallback ladder any more — `null` means the caller rejects the file outright. **Note PNG size tracks content, not dimensions** (a photographic PNG at 2048px is 6–9 MB), which is exactly why the output format is fixed rather than mirrored from the input. Bright images are inverted for the dark canvas in the same pass, baked into the bytes, so what is stored is what every client renders. Do not reintroduce a render-time inversion flag: it made appearance depend on `ctx.filter`, which is silently a no-op on engines that lack it. The black backfill must come **after** the inversion — laid down first it comes back white.

### PDF Insertion

A PDF is never stored as a PDF. `hooks/useInsertPdf.tsx` rasterises each page client-side with pdf.js and pushes them through the same encoder, upload route and Liveblocks meta as any pasted image — a page on the canvas is an ordinary `PastedImageMeta` with no PDF-ness left in it, which is why hit-testing, resize, delete and remote sync all work unchanged.

- **pdf.js is imported lazily**, on the first PDF only. It is a 420 KB chunk and a lesson that never opens one should not download it. The worker is resolved with `new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url)`, which Turbopack emits under `/_next/static/media/` — already inside `proxy.ts`'s skip list.
- **The page render scale is deliberately *not* capped at 1**, unlike `prepareImageFile`'s. A PDF page is vector, so there is no native resolution to preserve; scale 1 means 72 dpi and a blurry page. The cap belongs on bitmaps only.
- **`background: "#ffffff"` is pinned on every `page.render`** rather than left to the library default. `shouldInvert` reads mean luminance, so a transparent background reads as dark and skips the inversion every other page gets — one white sheet in a dark stack.
- **Pages stack vertically at a single scale derived from page 1**, so a file mixing page sizes stays uniform. Gap is a fraction of page height, not a world constant.
- **Selection after insert uses the marquee model** (`selectedImageIds` + `selectionBounds`), not `selectedImageId`, which holds exactly one id. The trade is no resize handles: the point of selecting a document is dragging all its pages together.
- **Rate limiting is charged once, up front.** `images/reserve` spends `pageCount` tokens against `workspace-pdf:upload` in one atomic call and returns a lease; each page upload spends the lease instead of a token. So a refusal happens before anything renders and can never strand half a document. See Rate Limiting below.
- Pages upload through a small concurrency pool and appear as each commits. A failure mid-run leaves the earlier pages placed and reports the count — deliberately, since a partial document is recoverable and a silent rollback of 40 pages is not.

### Touch, Stylus and Gestures

The canvas is driven by **Pointer Events only**. Never reintroduce a mouse or touch handler on it — Safari synthesises mouse events from pen input only after deciding the gesture is not a scroll, and suppresses the whole sequence when a contact begins soon after the last one ended. That is the cadence of handwriting, so an Apple Pencil silently lost whole letters while a slow straight line worked fine.

- **`touch-action: none` on the canvas is load-bearing**, not cosmetic. Without it Safari withholds pointer events while it evaluates the gesture, then fires `pointercancel` mid-stroke.
- **The `touchstart`/`touchmove` `preventDefault` listeners are not redundant with `touch-action`, and deleting them breaks the Apple Pencil.** iOS derives its pointer events from touch events, and `preventDefault()` on a `PointerEvent` never reaches the touch gesture underneath. Without them Safari resolves a quick Pencil drag as a *text selection*, raises its Copy/Look Up callout, and hands the stroke back as a `pointercancel` — which reads as "fast handwriting drops random letters". They must stay `{ passive: false }`. `gesturestart`/`gesturechange` are suppressed alongside for Safari's own pinch.
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
    └─ FullscreenLoader   ← shown until Liveblocks storage resolves
  dashboard/
    DashboardClient.tsx   ← data fetching, filter state, role gating
      └─ DashboardShell   ← Sidebar (lg+) / Navbar + TabBar swap, and the content column
           ├─ Sidebar.tsx      ← identity, Menu, then a one-button Actions section (see Dashboard
           │                     Actions below); mounts whichever modal that action needs
           ├─ Next.tsx         ← the next upcoming lesson
           ├─ Filters.tsx      ← search + collaborator filters
           ├─ WorkspaceLists   ← upcoming/past tabs
           │    └─ WorkspaceTable + WorkspaceTableRow (+ RowActionsMenu, PeopleStack)
           ├─ WorkspaceModal   ← create/edit, steps in workspaceModalSteps/
           ├─ mobile/          ← the sub-lg surface: TabBar (bottom nav + a floating button
           │                     carrying the same one action), WorkspaceList/WorkspaceRow
           │                     + WorkspaceDetailSheet, ConnectionsList/ConnectionRow,
           │                     FiltersSheet
           ├─ connections/     ← app/dashboard/connections: ConnectionsClient, ConnectionsTable +
           │                     ConnectionRow, LinkCodeDialog (generate/redeem tabs), InviteCountdown
           └─ skeletons/       ← loading states mirroring the real layouts, mobile and desktop
  home/                   ← Navbar (shared with dashboard/legal), hero CTAs
  policy/PolicyDocument   ← renders data/policies/*.json
```

Keyboard shortcuts (undo/redo, delete selection, etc.) live in `hooks/useKeybinds.tsx`.

### Dashboard Actions

The dashboard offers **at most one action per page**, derived from route × role in `lib/dashboardActions.ts` and rendered by the `Sidebar`'s Actions section at `lg+` and the `TabBar`'s floating button below it.

|  | `/dashboard` | `/dashboard/connections` |
| --- | --- | --- |
| tutor | Create workspace | Add a student |
| student | — | Add a tutor |
| admin | — | — |

- **One home per tier.** No page renders its own action button; both surfaces read the same helper. The rule used to be written out in each of them, which is how one action came to be called both "Add New Student" and "Link a student".
- **Absent, not disabled, when the page can't land the result.** Each page passes only the callback its own action needs — `/dashboard` passes `onCreated`, connections passes `onLinked` — and the button (plus its modal) is omitted otherwise. Greying it out instead is what put a dead "Create Workspace" on the connections page.
- Menu items use `opacity-25` for "not for your role"; an unbuilt destination carries a `Soon` badge instead, and the dimming sits on the icon and label rather than the row so the badge stays legible.

### Responsive Model (dashboard)

The dashboard is **mobile-first with a single seam at `lg`**. Below it, the phone layout; at `lg` and above, the desktop layout described throughout this file. There is deliberately no tablet tier yet — a portrait tablet currently gets the phone layout.

- Breakpoint swaps are **CSS-only** (`lg:hidden` / `hidden lg:block`), never a media-query hook: both trees mount, which avoids hydration mismatch and first-paint flash, and lets each tree keep behaviour the other doesn't have.
- **Nothing below `lg` links to `/board`.** The canvas is desktop-only for now and this is enforced by omitting every link — the `Next` card is inert, rows open a detail sheet, and "Join workspace" is absent from the mobile actions. There is no route guard; opening a board URL directly still works.
- **A landscape tablet clears `lg`, so the desktop tree must not assume a mouse.** Anything readable only on hover needs a tap path: `components/TapTooltip.tsx` keeps hover on a fine pointer and adds tap-to-open on a coarse one, decided per interaction from `pointerType` rather than a media query. Plain `Tooltip` is still fine for a label naming an action its trigger already performs.
- **The desktop workspace row does not open the board on click.** Joining goes through the row's `⋯` menu or the `Next` card, so a stray tap on a tablet can't drop someone into a lesson.
- Each table has a mobile counterpart in `components/dashboard/mobile/`: a compact row list whose rows open a `Sheet` holding the detail and actions that depend on hover at desktop.
- The `Sidebar`'s Actions are unreachable below `lg`, so `TabBar` carries them on a floating action button, picking one action from the current page and role.
- Bottom-flush chrome uses the `.pb-safe` utility (see `app/globals.css`), which needs `viewportFit: "cover"` from `app/layout.tsx`.

### Access Control & Roles

Two distinct concepts:

- **Account role** — `student | tutor | admin`, stored in Clerk `publicMetadata.role`. The three are **mutually exclusive and confer separate privileges**; neither tutor nor admin is a superset of the other. `lib/roles.ts` defines them and parses the stored value (failing closed to `student`). Server-side: `lib/serverRole.ts` (`getUserRole`, plus `requireTutor` / `requireAdmin` guards for API routes — each demands its exact role, so `requireTutor` rejects an admin — and `requireLinkRole`, which returns `"student" | "tutor"` or a 403, for the bidirectional invite-code flow). Client-side: `hooks/useUserRole.tsx`.
  - `student` — the default. Joins workspaces they were invited to; can link to tutors and see their linked tutors at `/dashboard/connections`.
  - `tutor` — creates, edits and deletes workspaces; can link to students and see their linked students. The workspace collaborator picker (`CollaboratorsPicker`) only ever offers linked students — `/api/users/friends` is strictly the caller's linked counterparties, not a general user search.
  - `admin` — internal tooling only (currently `/style-guide`). No product privileges, including linking — an admin can hold no tutor-student links. Don't widen a tutor-gated route to admins to make internal tooling easier.
- **Workspace host** — the creator of a workspace (`Workspace.host`), the only member allowed to edit it. Helpers in `lib/workspaceHost.ts`.
- **Tutor-student links** — a separate relation from workspace membership, stored in Supabase `tutor_links` (positional `tutor_id`/`student_id`, not role-stamped) and formed by redeeming a 10-minute invite code (`link_invites`). Either side can remove a link; removing one also strips the student from the tutor's future-dated rooms (`lib/unlinkRooms.ts` — note the accepted Liveblocks-token-revocation gap documented there). See `lib/links.ts`, `lib/inviteCode.ts`, `app/api/links/`.

`useUserRole` returns `student` until Clerk hydrates, so anything privileged must also gate on `isLoaded` or take a server-resolved role as a prop (`app/dashboard/page.tsx` resolves it and passes it to `DashboardClient`/`Sidebar` for this reason).

`app/api/liveblocks-auth/route.ts` gates room access: checks Supabase to confirm the authenticated Clerk user is in the room's `user_ids` array before issuing a Liveblocks token. Returns 403 otherwise (client redirects to `/forbidden`).

### Deployment (staged, promoted nightly)

Pushes to `main` build but **do not go live**. The Vercel project has **Auto-assign Custom Production Domains** turned off (Project Settings → Environments → Production → Branch Tracking), so each push produces a production deployment in the `STAGED` substate serving no traffic. `app/api/cron/promote-latest` promotes the newest staged build overnight, so a mid-afternoon push can't interrupt a lesson in progress.

- Scheduled `0 0 * * *` in `vercel.json`. Vercel cron expressions are UTC-only and DST-blind, and Hobby-plan crons only fire to within the hour, so the real window is roughly 00:00–02:00 UK local depending on the season. That imprecision is accepted deliberately — it is all outside tutoring hours, and pinning it tighter costs a second cron entry and a DST guard for no practical gain.
- Crons invoke the **currently live** deployment, i.e. the one *before* whatever is about to be promoted. Changes to `promote-latest` itself only take effect the night after they go live, and the first deploy containing the route has to be promoted by hand once to bootstrap it.
- Vercel API access lives in `lib/vercelDeployments.ts`. Promotion is an alias swap, not a rebuild.
- **`readySubstate === "STAGED"` is not "waiting to go live" — it is permanent for every push that was never promoted.** Push three times in a day and that night's run promotes the newest, leaving two candidates that never expire; a later night with nothing new then promotes one of *those*, walking production backwards a commit per night. So the newest staged build is only promotable if it is **newer than the live one**, read from `targets.production` on `/v9/projects/{id}` (`fetchLiveProductionDeployment`). Never gate on the substate alone.
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
- `userTypes.ts` — `UserRole`, `userInfo`, `Workspace`, `WorkspaceEditData`
- `linkTypes.ts` — `LinkRole`, `TutorLinkRow`/`LinkInviteRow` (raw Supabase shapes), `LinkInvite`/`LinkSummary` (client-facing shapes)
- `policyTypes.ts` — `PolicyDocument`/`PolicySection`/`PolicyBlock` for the legal pages, including the supported inline markup

### Shared Helpers (`lib/`)

Beyond the modules described above: `colours.ts` (pen/highlighter palettes), `userColour.ts` (deterministic per-user identity colour), `textUtils.ts` (relative/countdown/session time formatting), `imageUtils.ts` (image hit-testing and resize handles), `imageLimits.ts` (the storable MIME set and byte cap shared with the images route and matched by the storage bucket, the wider client-only input set, and the PDF page cap), `imagePrepare.ts` (decode, then re-encode every image once into the configured box as JPEG, inverting bright ones), `imageUpload.ts` (the upload/lease-reserve calls and the local-state adopt/rollback steps, shared by the image and PDF insert paths), `pdfLease.ts` (the pre-paid page quota — see Rate Limiting above), `id.ts` (`newId` — client-side ids, see Touch above), `viewport.ts` (zoom clamps, the shared anchor rule, and insert placement/fit), `deleteSelection.ts` (shared by the Delete keybind and the on-canvas button), `dashboardFilters.ts` / `dashboardTableColumns.ts` / `connectionsTableColumns.ts` / `dashboardCounterparty.ts` (dashboard list logic), `dashboardActions.ts` (the route × role → single action rule shared by `Sidebar` and `TabBar` — see Dashboard Actions above), `deleteWorkspace.ts` (tears down Liveblocks room, storage images and the Supabase row in a recoverable order), `clerkAppearance.ts` (Clerk theming), `clerkUsers.ts` (`fetchUserProfiles` — the one place Clerk ids get turned into `userInfo`; guards the empty-array-returns-everyone Clerk API footgun), `inviteCode.ts` (invite code alphabet/generation/normalisation), `links.ts` (`tutor_links` queries), `unlinkRooms.ts` (the unlink-cascade helper — see Access Control above), `supabase/admin.ts` (service-role client), `vercelDeployments.ts` (Vercel REST API wrapper for the staged-deployment promotion flow — see Deployment above).

### Path Alias

`@/*` maps to the repo root (configured in `tsconfig.json`).
