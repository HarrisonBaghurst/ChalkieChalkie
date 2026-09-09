# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
Always address me by name at the beginning of a responce (Harrison).
Always interview and never make blind assumptions.
Give all plans concisely.

**This file is deliberately short.** The detail lives in `docs/`, routed by the table at the bottom. Read the doc for what you are touching; do not read all of them.

## Comments

Never add a comment to any file.

Not why, not what, not `TODO:`. If something needs explaining, say it in the CLI response.

Existing comments stay untouched — they are not a licence to add more. **This codebase already contains ~360 comment lines written before this rule. They are not house style and not a precedent. Do not match them.** When you edit a file that has them, leave them alone and add none of your own.

This applies to every file type: TypeScript, CSS, JSON, config, and the Worker.

## Non-Negotiables

These apply to every edit, whatever you are working on:

- **No comments.** See above.
- **Four-space indentation.** There is no Prettier config, so a bare `npx prettier --write` reformats to two spaces. Files under `components/ui/` came from the shadcn registry at two spaces and are left as-is.
- **Merge classes with `cn()`** from `lib/utils.ts` — it registers the `text-display … text-caption` scale with tailwind-merge, which otherwise mistakes those for text colours and drops one of size/colour.
- **Semantic tokens only** — never literal colours or stock Tailwind greys.
- **The type scale** (`text-body`, `text-caption`, …), never raw `text-sm`/`text-lg`.
- **Rounding tiers** `radius-tag` / `radius-control` / `radius-surface` over raw `rounded-*`.
- **No `dark:` modifiers** — nothing sets `.dark`; the app is permanently dark via `:root`. Strip them when pasting from the shadcn registry.
- **British spelling** in identifiers and copy (`colour`, `optimisation`); shadcn's `--color-*` token names are the exception.
- **`@/*` maps to the repo root** (configured in `tsconfig.json`).
- **`npm run build` does not typecheck the Worker.** `realtime/` is a separate npm project, excluded from the root `tsconfig.json` and `eslint.config.mjs`. Run `cd realtime && npm run typecheck` separately.

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

`realtime/package.json` pins **wrangler 4.86** because anything newer requires Node 22 and this machine is on 20. `compatibility_date` in `wrangler.jsonc` is bounded by that binary; raise both together.

## Where The Detail Lives

Read the doc that covers what you are about to touch, before touching it.

| Editing | Read first |
| --- | --- |
| Any UI, styling, a new token or shared component | [docs/design-system.md](docs/design-system.md) |
| `components/Workspace.tsx`, `Toolbar*`, `CursorLayer`, `SelectionActions`, `hooks/useCanvas*`, `useKeybinds`, `useImagePaste`, `useInsertImage`, `lib/handlers/`, `lib/canvasDrawing.ts`, `lib/genometry.ts`, `lib/strokeOptimisation.ts`, `lib/viewport.ts` | [docs/canvas.md](docs/canvas.md) |
| `realtime/`, `hooks/realtime/`, `useLiveWorkspace`, `useSelectionPresence`, `useRemoteSelections`, `types/realtimeTypes.ts`, `types/presenceTypes.ts` | [docs/realtime.md](docs/realtime.md) |
| `hooks/useInsertPdf.tsx`, `lib/r2.ts`, `lib/image*.ts`, `lib/pdfLease.ts`, `app/api/workspaces/*/images/` | [docs/images.md](docs/images.md) |
| `components/dashboard/`, `app/dashboard/`, `lib/dashboard*.ts`, `lib/tableColumns.ts`, `lib/*Cookie.ts` | [docs/dashboard.md](docs/dashboard.md) |
| `app/api/`, `proxy.ts`, `app/(home)/`, `app/(legal)/`, route layout or a new page | [docs/routes-api.md](docs/routes-api.md) |
| Auth, roles, websocket tickets, eviction, workspace open/expiry windows, `lib/roles.ts`, `lib/serverRole.ts`, `lib/realtimeTicket.ts`, `lib/realtimeAdmin.ts`, `lib/workspaceLifecycle.ts`, `lib/links.ts` | [docs/access-control.md](docs/access-control.md) |
| Deployment, `vercel.json`, `app/api/cron/`, `lib/ratelimit.ts`, `lib/errorResponse.ts`, `data/changelog.json`, version bumps | [docs/ops.md](docs/ops.md) |
| Adding or changing an environment variable | [docs/environment.md](docs/environment.md) |
| "Where does this component live?" | [docs/components.md](docs/components.md) |
| "Which type or helper does this?" | [docs/reference.md](docs/reference.md) |

**Do not use `@docs/...` import syntax in this file.** That inlines the docs at session start, which is exactly the cost this split exists to avoid. Plain markdown links only.

When a change alters behaviour one of those docs describes, update that doc in the same change — not this file. This file only grows when a rule applies to *every* edit.
