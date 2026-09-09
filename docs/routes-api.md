# Routes & API

## Route Structure

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
