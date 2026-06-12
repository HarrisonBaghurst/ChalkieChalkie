# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
Always address me by name at the beginning of a responce (Harrison).
Always interview and never make blind assumptions.
Give all plans concisely.

## Project Overview

ChalkieChalkie is a real-time collaborative whiteboard application for tutoring. Tutors schedule lessons (workspaces) with students, and multiple users can draw, highlight, erase, select/move, and paste images on a shared canvas simultaneously.

**Core tech stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Liveblocks (real-time sync), Clerk (auth), Supabase (PostgreSQL + image storage), Upstash Redis (rate limiting), Resend (contact emails), sonner (toasts).

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

## Architecture

### Route Structure

- `app/(home)/` — Public landing page (hero, beta sign-up, contact) with its own `Navbar` layout
- `app/dashboard/` — Authenticated dashboard: upcoming/past lessons, filters, workspace create/edit modal (`components/dashboard/`)
- `app/board/[boardId]/` — The whiteboard canvas page; wraps `<Workspace>` in a Liveblocks `<Room>` provider (`Room.tsx`)
- `app/sign-in/` — Clerk sign-in page (styled via `lib/clerkAppearance.ts`)
- `app/forbidden/` — Shown when a user fails workspace access (403 from liveblocks-auth)
- `app/api/` — Backend routes:
  - `liveblocks-auth` — issues Liveblocks tokens after membership check
  - `workspaces` (+ `[workspaceId]`, `[workspaceId]/images`) — workspace CRUD and pasted-image upload/delete; shared validation in `_shared.ts`
  - `users/batch`, `users/friends`, `users/workspaces` — user lookups
  - `contact` — contact form via Resend
  - `cron/remove-unused-rooms` — deletes rooms inactive >2 weeks; runs daily at 05:00 via `vercel.json` crons, authenticated with `CRON_SECRET`

`proxy.ts` is the Clerk middleware: protects `/board(.*)` and `/dashboard(.*)`.

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
4. Stroke points are simplified via `lib/strokeOptimisation.ts` before being stored.
5. Pasted images (`hooks/useImagePaste.tsx`) are uploaded to Supabase storage via `api/workspaces/[workspaceId]/images`, which returns a signed URL stored in Liveblocks meta.

### Component Structure

```
Workspace.tsx            ← root canvas component; owns CanvasState ref, tool state, pan/zoom
  ├─ Toolbar.tsx         ← left toolbar (tool selection, colours, undo/redo)
  ├─ Navbar (home/)      ← top navigation bar
  ├─ ParticipantRoster   ← who's in the room (from Presence/others)
  └─ CursorLayer.tsx     ← renders other users' cursors from Presence
```

Keyboard shortcuts (undo/redo, delete selection, etc.) live in `hooks/useKeybinds.tsx`.

### Access Control & Roles

Two distinct concepts:

- **Account role** (`tutor` | `student`) — stored in Clerk `publicMetadata.role`. Server-side: `lib/serverRole.ts` (`getUserRole`, `requireTutor` guard for API routes). Client-side: `hooks/useUserRole.tsx`.
- **Workspace host** — the creator of a workspace (`Workspace.host`), the only member allowed to edit it. Helpers in `lib/workspaceHost.ts`.

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

### Path Alias

`@/*` maps to the repo root (configured in `tsconfig.json`).
