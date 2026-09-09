# Access Control & Lifecycle

## Access Control & Roles

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

## Workspace Lifecycle

A workspace is openable only inside a window derived from its `start_time`, and is deleted in full — Durable Object, R2 images and the Supabase row — once that window closes. `lib/workspaceLifecycle.ts` is the single source of truth and is imported by the API routes and the dashboard alike; nothing else may compute these boundaries.

Two derived columns carry it, both written **only** by workspace-create and workspace-PATCH:

```
opens_at   = start_time − leadMs        (null when start_time is null)
expires_at = start_time + retentionMs   (creation time when start_time is null)
```

- **The deadline is stored, not derived at query time, because both durations are paid-plan variables.** `limitsForPlan()` returns `{ leadMs: 1h, retentionMs: 14d }` for every account today. When tiers land, the host's plan is looked up in those two write paths and passed in — the cron stays one indexed `.lt("expires_at", now)` however many tiers exist, and a plan change becomes a recompute of that host's rows. Do not move the arithmetic into the cron; that reintroduces a per-room plan lookup on a 500-row batch.
- **A NULL `expires_at` is invisible to the cron** (Postgres `lt` excludes NULL), which is what makes the columns safe to add ahead of any backfill. It also means a row that somehow escapes both write paths is immortal — if the DB-side `upsert_room` RPC is ever changed to insert rather than update, it must set `expires_at`.
- **No start time means no access and a same-night deletion.** `expires_at` is set to the creation time, so the next 05:00 run sweeps it. The modal warns on both the Schedule and Review steps.
- **The lock reads the stored `opens_at`, never the incoming value.** Once a workspace has opened its start time is frozen; PATCH 409s on a change. It must compare _parsed instants_ against the stored `start_time` and let an unchanged value through — `WorkspaceModal` sends all five fields on every save, so a value comparison is the only thing that lets a locked workspace's feedback still be edited. `sameInstant` exists for this; string equality fails because the modal round-trips through `toISOString()` and Postgres returns a different format.
- **A start time inside the lock window is allowed**, so an ad-hoc "lesson now" works. The modal confirms first, since the resulting workspace is immediately locked and can only be undone by deleting it.
- **Deletion is indifferent to activity.** `last_activity_at` is still written by `realtime-auth` but no longer drives anything; a room drawn in on day 13 still dies on day 14, feedback included. That determinism is what makes the window priceable.
- `lifecyclePhase` / `lifecycleStatus` / `joinDenialLabel` drive the dashboard's Status column, its disabled Join action and the mobile row dot, so all three agree by construction. They take `now` as an argument rather than reading the clock, and the dashboard feeds them `hooks/useNow.tsx` on a 60-second tick — `DashboardClient` previously froze `now` at mount, so no boundary ever advanced on an open page.
