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
- `ENVIRONMENT` — set to `testing` to render the dashboard from `data/testWorkspaces.json` instead of live API data

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

`proxy.ts` is the Clerk middleware: protects `/board(.*)` and `/dashboard(.*)`. `/style-guide` is deliberately **not** listed there — a middleware redirect to sign-in would advertise that the route exists, so the page gates itself and 404s instead.

### Real-Time Data Model (Liveblocks)

Defined in `liveblocks.config.ts`:

```ts
Storage: {
  canvasStrokes: LiveList<Stroke>        // All drawing strokes
  pastedImages: LiveList<PastedImageMeta> // Pasted images with position/size
}
Presence: {
  cursor: { x: number; y: number } | null  // Live cursor position per user
}
UserMeta: { id, info: { firstName, lastName, imageUrl, email } } // set server-side at auth
```

All mutations (add/delete/move strokes, add/move/resize images) go through hooks in `hooks/useLiveWorkspace.tsx`. Never mutate Liveblocks storage directly from components.

### Drawing Pipeline

1. Mouse events on the `<canvas>` in `components/Workspace.tsx` go through `lib/handlers/mouseDown.ts` / `mouseMove.ts` / `mouseUp.ts`, which dispatch to per-tool strategies in `lib/handlers/tools/` (`pen`, `eraser`, `pointer`, `selector`, `highlighter`) registered in `lib/handlers/toolStrategies.ts`. Pan is intentionally not a strategy: it is bound to the right mouse button regardless of active tool (`tools/pan.ts`).
2. All mutable interaction state (viewport/camera, in-progress stroke, selection, images) lives in a single `CanvasState` object held in one ref — see `types/canvasStateTypes.ts`. Tools receive a `ToolContext` with that state plus `ToolCallbacks` (Liveblocks mutations) and commit on mouse-up.
3. `hooks/useCanvasRenderLoop.tsx` runs a `requestAnimationFrame` loop calling primitives in `lib/canvasDrawing.ts` to render all strokes and images.
4. Stroke points are simplified via `lib/strokeOptimisation.ts` before being stored. Hit-testing (eraser, selector) uses `lib/genometry.ts`, which tests segments rather than points because simplification discards intermediate points.
5. Pasted images (`hooks/useImagePaste.tsx`) are uploaded to Supabase storage via `api/workspaces/[workspaceId]/images`, which returns a signed URL stored in Liveblocks meta.

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
      └─ DashboardShell   ← sidebar (2xl+) / Navbar swap + inset content column
           ├─ Sidebar.tsx      ← identity, nav, role-gated Actions section (Create Workspace for
           │                     tutors; Add New Student/Tutor for both), mounts LinkCodeDialog
           ├─ Next.tsx         ← the next upcoming lesson
           ├─ Filters.tsx      ← search + collaborator filters
           ├─ WorkspaceLists   ← upcoming/past tabs
           │    ├─ WorkspaceTable + WorkspaceTableRow (+ RowActionsMenu, PeopleStack)
           │    └─ WorkspaceCard
           ├─ WorkspaceModal   ← create/edit, steps in workspaceModalSteps/
           ├─ connections/     ← app/dashboard/connections: ConnectionsClient, ConnectionsTable +
           │                     ConnectionRow, LinkCodeDialog (generate/redeem tabs), InviteCountdown
           └─ skeletons/       ← loading states mirroring the real layouts
  home/                   ← Navbar (shared with dashboard/legal), hero CTAs
  policy/PolicyDocument   ← renders data/policies/*.json
```

Keyboard shortcuts (undo/redo, delete selection, etc.) live in `hooks/useKeybinds.tsx`.

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

### Rate Limiting

`lib/ratelimit.ts` is the single source of truth: a `RATE_LIMITS` table mapping each route key to `{ keyBy: "userId" | "ip", limit, window }`, enforced via Upstash sliding window (`enforceRateLimit` returns a 429 Response or null). Fail-open if Upstash is unreachable, with the outage reported. Every API route calls this before doing work.

### Error Handling

`lib/errorResponse.ts` — `reportError` logs to console and persists to the Supabase `error_logs` table; `errorResponse` is the single chokepoint for API catch branches, returning a consistent `{ error }` JSON shape. Use these instead of raw `console.error` in API routes.

### Key Type Definitions (`types/`)

- `strokeTypes.ts` — `Point`, `Stroke { id, points[], colour, highlight? }`
- `imageTypes.ts` — `PastedImageMeta` (position/size, `inverted` flag for dark-mode inversion), `PastedImage` (meta + loaded element), `ResizeHandle`
- `toolTypes.ts` — `Tools: "pen" | "eraser" | "pointer" | "selector" | "highlighter"` + per-tool cursor map
- `canvasStateTypes.ts` — `CanvasState`, `Viewport`, `ToolContext`, `ToolCallbacks`, `ToolStrategy`
- `userTypes.ts` — `UserRole`, `userInfo`, `Workspace`, `WorkspaceEditData`
- `linkTypes.ts` — `LinkRole`, `TutorLinkRow`/`LinkInviteRow` (raw Supabase shapes), `LinkInvite`/`LinkSummary` (client-facing shapes)
- `policyTypes.ts` — `PolicyDocument`/`PolicySection`/`PolicyBlock` for the legal pages, including the supported inline markup

### Shared Helpers (`lib/`)

Beyond the modules described above: `colours.ts` (pen/highlighter palettes), `userColour.ts` (deterministic per-user identity colour), `textUtils.ts` (relative/countdown/session time formatting), `imageUtils.ts` (image hit-testing and resize handles), `dashboardFilters.ts` / `dashboardTableColumns.ts` / `connectionsTableColumns.ts` / `dashboardCounterparty.ts` (dashboard list logic), `deleteWorkspace.ts` (tears down Liveblocks room, storage images and the Supabase row in a recoverable order), `clerkAppearance.ts` (Clerk theming), `clerkUsers.ts` (`fetchUserProfiles` — the one place Clerk ids get turned into `userInfo`; guards the empty-array-returns-everyone Clerk API footgun), `inviteCode.ts` (invite code alphabet/generation/normalisation), `links.ts` (`tutor_links` queries), `unlinkRooms.ts` (the unlink-cascade helper — see Access Control above), `supabase/admin.ts` (service-role client).

### Path Alias

`@/*` maps to the repo root (configured in `tsconfig.json`).
