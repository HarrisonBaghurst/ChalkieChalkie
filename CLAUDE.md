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
  - `workspaces` (+ `[workspaceId]`, `[workspaceId]/images`) — workspace CRUD and pasted-image upload/delete; shared validation in `_shared.ts`
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
- **Published bounds come off storage** (`strokes`, `pastedImagesMeta`), never off `selectorDelta` or the locally mutated `state.pastedImages`. A drag reaches storage only on mouse-up, so a box that tracked the live gesture would slide away from the strokes it frames and they would snap after it. Frozen at the committed geometry, box and content jump together on commit. The poll is per-frame rather than throttled for the same reason: the bounds change then enters the same socket flush as the storage write that caused it.
- **Consumed** by `hooks/useRemoteSelections.tsx`: fills `CanvasState.lockedStrokeIds` / `lockedImageIds` so tools reach locks through the `ToolContext` they already take, and returns a ref of `{ colour, bounds }` for the render loop (a ref, so a presence tick doesn't restart the rAF loop).
- **Enforced** in `lib/handlers/tools/pointer.ts`: locked images are filtered *out of the hit-test list*, not merely refused, so a locked image on top doesn't become a dead zone over what sits beneath it. The marquee resolution filters locked ids the same way.
- **Drawn** by `drawRemoteSelection` in `lib/canvasDrawing.ts`, last, in the owner's `getUserColour` — tune `REMOTE_SELECTION_LINE_WIDTH` / `REMOTE_SELECTION_RADIUS` there.
- A selecting user's **cursor is replaced by their name pill**, pinned to the box in `CursorLayer.tsx`. The pill deliberately has no CSS transition, unlike the cursor: the box it labels is canvas-drawn without one.
- Simultaneous marquees over the same strokes can both win — the lock is optimistic, not authoritative. Accepted: it is brief, and storage writes are last-write-wins regardless.

### Drawing Pipeline

1. Mouse events on the `<canvas>` in `components/Workspace.tsx` go through `lib/handlers/mouseDown.ts` / `mouseMove.ts` / `mouseUp.ts`, which dispatch to per-tool strategies in `lib/handlers/tools/` (`pen`, `eraser`, `pointer`, `selector`, `highlighter`) registered in `lib/handlers/toolStrategies.ts`. Pan is intentionally not a strategy: it is bound to the right mouse button regardless of active tool (`tools/pan.ts`).
2. All mutable interaction state (viewport/camera, in-progress stroke, selection, images) lives in a single `CanvasState` object held in one ref — see `types/canvasStateTypes.ts`. Tools receive a `ToolContext` with that state plus `ToolCallbacks` (Liveblocks mutations) and commit on mouse-up.
3. `hooks/useCanvasRenderLoop.tsx` runs a `requestAnimationFrame` loop calling primitives in `lib/canvasDrawing.ts` to render all strokes and images.
4. Stroke points are simplified via `lib/strokeOptimisation.ts` before being stored. Hit-testing (eraser, selector) uses `lib/genometry.ts`, which tests segments rather than points because simplification discards intermediate points.
5. Pasted images (`hooks/useImagePaste.tsx`) are uploaded to Supabase storage via `api/workspaces/[workspaceId]/images`, which returns a signed URL stored in Liveblocks meta. Only PNG and JPEG are accepted, on both the paste handler and the route. Images too bright for the dark canvas are inverted **before upload** — the pixels are inverted in place and re-encoded, so what is stored is what every client renders. Do not reintroduce a render-time inversion flag: it made appearance depend on `ctx.filter`, which is silently a no-op on engines that lack it.

### Component Structure

```
components/
  ui/                     ← shared shadcn primitives, restyled onto the tokens
  styleGuide/             ← the admin style guide page (see Design System)
  Workspace.tsx           ← root canvas component; owns CanvasState ref, tool state, pan/zoom
    ├─ BoardHeader.tsx    ← host identity + inline-editable workspace title
    ├─ Toolbar.tsx        ← left toolbar (tools, colour fans via ToolbarButton/ColourSelector)
    ├─ ParticipantRoster  ← who's in the room (from Presence/others)
    ├─ CursorLayer.tsx    ← renders other users' cursors from Presence
    └─ FullscreenLoader   ← shown until Liveblocks storage resolves
  dashboard/
    DashboardClient.tsx   ← data fetching, filter state, role gating
      └─ DashboardShell   ← Sidebar (lg+) / Navbar + TabBar swap, and the content column
           ├─ Sidebar.tsx      ← identity, nav, role-gated Actions section (Create Workspace for
           │                     tutors; Add New Student/Tutor for both), mounts LinkCodeDialog
           ├─ Next.tsx         ← the next upcoming lesson
           ├─ Filters.tsx      ← search + collaborator filters
           ├─ WorkspaceLists   ← upcoming/past tabs
           │    └─ WorkspaceTable + WorkspaceTableRow (+ RowActionsMenu, PeopleStack)
           ├─ WorkspaceModal   ← create/edit, steps in workspaceModalSteps/
           ├─ mobile/          ← the sub-lg surface: TabBar (bottom nav + floating action
           │                     button, carrying Sidebar's Actions), WorkspaceList/WorkspaceRow
           │                     + WorkspaceDetailSheet, ConnectionsList/ConnectionRow,
           │                     FiltersSheet
           ├─ connections/     ← app/dashboard/connections: ConnectionsClient, ConnectionsTable +
           │                     ConnectionRow, LinkCodeDialog (generate/redeem tabs), InviteCountdown
           └─ skeletons/       ← loading states mirroring the real layouts, mobile and desktop
  home/                   ← Navbar (shared with dashboard/legal), hero CTAs
  policy/PolicyDocument   ← renders data/policies/*.json
```

Keyboard shortcuts (undo/redo, delete selection, etc.) live in `hooks/useKeybinds.tsx`.

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
- Vercel API access lives in `lib/vercelDeployments.ts`. Promotion is an alias swap, not a rebuild, and a deployment can only be promoted once — hence the `readySubstate === "STAGED"` filter. To ship something urgently, promote by hand in the dashboard; the cron will find nothing staged and no-op.

### Rate Limiting

`lib/ratelimit.ts` is the single source of truth: a `RATE_LIMITS` table mapping each route key to `{ keyBy: "userId" | "ip", limit, window }`, enforced via Upstash sliding window (`enforceRateLimit` returns a 429 Response or null). Fail-open if Upstash is unreachable, with the outage reported. Every API route calls this before doing work.

### Error Handling

`lib/errorResponse.ts` — `reportError` logs to console and persists to the Supabase `error_logs` table; `errorResponse` is the single chokepoint for API catch branches, returning a consistent `{ error }` JSON shape. Use these instead of raw `console.error` in API routes.

### Key Type Definitions (`types/`)

- `strokeTypes.ts` — `Point`, `Stroke { id, points[], colour, highlight? }`
- `imageTypes.ts` — `PastedImageMeta` (position/size), `PastedImage` (meta + loaded element), `ResizeHandle`
- `toolTypes.ts` — `Tools: "pen" | "eraser" | "pointer" | "selector" | "highlighter"` + per-tool cursor map
- `canvasStateTypes.ts` — `CanvasState`, `Viewport`, `ToolContext`, `ToolCallbacks`, `ToolStrategy`
- `presenceTypes.ts` — `SelectionPresence` (the Presence payload), `RemoteSelection` (what the renderer draws)
- `userTypes.ts` — `UserRole`, `userInfo`, `Workspace`, `WorkspaceEditData`
- `linkTypes.ts` — `LinkRole`, `TutorLinkRow`/`LinkInviteRow` (raw Supabase shapes), `LinkInvite`/`LinkSummary` (client-facing shapes)
- `policyTypes.ts` — `PolicyDocument`/`PolicySection`/`PolicyBlock` for the legal pages, including the supported inline markup

### Shared Helpers (`lib/`)

Beyond the modules described above: `colours.ts` (pen/highlighter palettes), `userColour.ts` (deterministic per-user identity colour), `textUtils.ts` (relative/countdown/session time formatting), `imageUtils.ts` (image hit-testing and resize handles), `dashboardFilters.ts` / `dashboardTableColumns.ts` / `connectionsTableColumns.ts` / `dashboardCounterparty.ts` (dashboard list logic), `deleteWorkspace.ts` (tears down Liveblocks room, storage images and the Supabase row in a recoverable order), `clerkAppearance.ts` (Clerk theming), `clerkUsers.ts` (`fetchUserProfiles` — the one place Clerk ids get turned into `userInfo`; guards the empty-array-returns-everyone Clerk API footgun), `inviteCode.ts` (invite code alphabet/generation/normalisation), `links.ts` (`tutor_links` queries), `unlinkRooms.ts` (the unlink-cascade helper — see Access Control above), `supabase/admin.ts` (service-role client), `vercelDeployments.ts` (Vercel REST API wrapper for the staged-deployment promotion flow — see Deployment above).

### Path Alias

`@/*` maps to the repo root (configured in `tsconfig.json`).
