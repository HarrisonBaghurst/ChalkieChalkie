# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
Always address me by name at the beginning of a responce (Harrison).
Always interview and never make blind assumptions.
Give all plans concisely.

## Project Overview

ChalkieChalkie is a real-time collaborative whiteboard application for teaching. Multiple users can draw, erase, and paste images on a shared canvas simultaneously.

**Core tech stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Liveblocks (real-time sync), Clerk (auth), Supabase (PostgreSQL).

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
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`)
- `RESEND_API_KEY`, `CONTACT_EMAIL`
- `CRON_SECRET`

## Architecture

### Route Structure

- `app/(home)/` — Landing page showing a user's workspaces
- `app/board/[boardId]/` — The main whiteboard canvas page; wraps `<Workspace>` in a Liveblocks `<Room>` provider
- `app/sign-in/` — Clerk sign-in page
- `app/api/` — Backend routes: `liveblocks-auth`, `workspaces`, `users`, `contact`, `cron`

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
```

All mutations (add/delete strokes, add/move images) go through hooks in `hooks/useLiveWorkspace.tsx`. Never mutate Liveblocks storage directly from components.

### Drawing Pipeline

1. Mouse events on the `<canvas>` in `components/Workspace.tsx` are routed to tool-specific handlers in `lib/handlers/` (`penHandler.ts`, `eraserHandler.ts`, `pointerHandler.ts`, `panHandler.ts`)
2. Handlers update local in-progress state and call Liveblocks mutations on mouse-up
3. `hooks/useCanvasRenderLoop.tsx` runs a `requestAnimationFrame` loop that calls primitives in `lib/canvasDrawing.ts` to render all strokes and images
4. Stroke points are simplified via `lib/strokeOptimisation.ts` before being stored

### Component Structure

```
Workspace.tsx          ← root canvas component; owns tool state, pan/zoom
  ├─ Sidebar.tsx       ← left toolbar (tool selection, color, undo/redo)
  ├─ WorkspaceTopbar   ← top bar (title, home nav, user info)
  └─ CursorLayer.tsx   ← renders other users' cursors from Presence
```

### Access Control

`app/api/liveblocks-auth/route.ts` gates room access: checks Supabase to confirm the authenticated Clerk user is in the workspace's `user_ids` array before issuing a Liveblocks token. Returns 403 otherwise.

### Key Type Definitions (`types/`)

- `strokeTypes.ts` — `Stroke { id, points[], colour }`
- `imageTypes.ts` — `PastedImageMeta` (position, size, inverted flag for dark-mode inversion)
- `toolTypes.ts` — `Tool: "pen" | "eraser" | "pointer"`
- `userTypes.ts` — `User`, `Workspace`

### Path Alias

`@/*` maps to the repo root (configured in `tsconfig.json`).
