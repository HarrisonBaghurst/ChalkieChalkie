# Access Control & Lifecycle

## Access Control & Roles

Two distinct concepts:

- **Account role** — `student | tutor | admin`, stored in Clerk `publicMetadata.role`. The three are **mutually exclusive and confer separate privileges**; neither tutor nor admin is a superset of the other. `lib/roles.ts` defines them and parses the stored value (failing closed to `student`). Server-side: `lib/serverRole.ts` (`getUserRole`, plus `requireTutor` / `requireAdmin` guards for API routes — each demands its exact role, so `requireTutor` rejects an admin — and `requireLinkRole`, which returns `"student" | "tutor"` or a 403, for the bidirectional invite-code flow). Client-side: `hooks/useUserRole.tsx`.
    - `student` — the default. Joins workspaces they were invited to; can link to tutors and see their linked tutors at `/dashboard/connections`.
    - `tutor` — creates, edits and deletes workspaces; can link to students and see their linked students. The workspace collaborator picker (`CollaboratorsPicker`) only ever offers linked students — `/api/users/friends` is strictly the caller's linked counterparties, not a general user search.
    - `admin` — internal tooling only (currently `/style-guide`). No product privileges, including linking — an admin can hold no tutor-student links. Don't widen a tutor-gated route to admins to make internal tooling easier.
    - **Nothing in the repo ever writes `publicMetadata`.** There is no Clerk webhook and no admin route, so a new account is a student *by absence of the key* rather than by assignment, and promoting someone to tutor is a hand-edit in the Clerk dashboard. `POST /api/tutor-access` is only how a request reaches you — it sends an email with the Clerk ID stamped server-side, and you still make the change by hand. Anything that automates promotion has to add the first write path.
- **Workspace host** — the creator of a workspace (`Workspace.host`), the only member allowed to edit it. Helpers in `lib/workspaceHost.ts`.
- **Tutor-student links** — a separate relation from workspace membership, stored in Supabase `tutor_links` (positional `tutor_id`/`student_id`, not role-stamped) and formed by redeeming a 10-minute invite code (`link_invites`). Either side can remove a link; removing one also strips the student from the tutor's future-dated rooms (`lib/unlinkRooms.ts`) and evicts their live sockets from those rooms. See `lib/links.ts`, `lib/inviteCode.ts`, `app/api/links/`.

**Revocation reaches a connected user**, because membership is otherwise only checked when a socket opens. `evictRoomMembers` in `lib/realtimeAdmin.ts` posts to the Worker's secret-gated `POST /rooms/:id/evict?userId=`, which closes that user's sockets in the room's DO with code 1008. Two callers: the unlink cascade above, and the workspace PATCH, which diffs the old `user_ids` against the new one so an edit that drops a collaborator behaves the same. Workspace deletion needs neither — the DO's `DELETE` closes every socket itself.

- **Order is load-bearing: Supabase first, then evict.** The close is what triggers the client's reconnect, and a reconnect while the row still lists them mints a fresh ticket and lets them straight back in.
- **The call is best-effort and never fails its caller** — it reports through `reportError` and returns. The row is already correct, so a Worker outage costs one stale session rather than a failed unlink or a failed save.
- **No client change was needed.** `client.ts` ignores the close code and reconnects, `/api/realtime-auth` 403s, and `RoomProvider` pushes to `/forbidden`. If you ever want a message first, that is where to branch on 1008.

`useUserRole` returns `student` until Clerk hydrates, so anything privileged must also gate on `isLoaded` or take a server-resolved role as a prop (`app/dashboard/page.tsx` resolves it and passes it to `DashboardClient`/`Sidebar` for this reason).

`app/api/realtime-auth/route.ts` gates room access: checks Supabase to confirm the authenticated Clerk user is in the room's `user_ids` array, then that the room is inside its access window, **that the host has opened it**, and **that the host still has a granting plan**, before signing a ticket. Returns 403 otherwise (client redirects to `/forbidden`). Membership failure returns a bodyless 403 so a non-member learns nothing; a **member** who fails a later check gets `{ reason }`, which `client.ts` reads and `RoomProvider` forwards as `/forbidden?reason=`.

- **The plan check runs after the lifecycle checks and before the `opened_at` stamp**, so a lapsed host cannot open a room they can no longer host, and the more specific lifecycle reason wins when both apply.
- **`lessonInFlight` exempts a lesson already under way** — `opened_at` set and `now` before `start_time + DASHBOARD_GRACE_MS`. Tickets expire after 60 seconds and this route runs on every reconnect, so without the carve-out a plan lapsing mid-lesson would permanently bounce the next person whose connection dropped. See [docs/plans.md](plans.md).

- The ticket is a 60-second HMAC-SHA256 JWS over `{ sub, room, info, host, cap, iat, exp }`, signed in `lib/realtimeTicket.ts` and verified in `realtime/src/ticket.ts` against a shared `REALTIME_TICKET_SECRET`. It authorises **exactly one room**, so a member of one room cannot replay their ticket into another. `host` and `cap` carry the room's member limit under the same signature, so the Worker never looks a plan up — see [docs/plans.md](plans.md).
- **It travels as a websocket subprotocol, not a query parameter** — `new WebSocket(url, ["chalkie.v1", ticket])` — so it never lands in a URL or an access log. Two things this depends on: the DO must echo `Sec-WebSocket-Protocol: chalkie.v1` on its 101 or Chrome fails the handshake, and base64url plus `.` are all valid RFC 7230 `tchar`s so a JWS is header-safe.
- **The Worker forwards the original `Request`, never a rebuilt one.** A fresh `Request` drops `Upgrade: websocket` and the runtime then refuses to return a socket at all. Identity is added as `x-chalkie-user` / `x-chalkie-info` headers on a copy, and the ticket header is stripped before the DO sees it.
- Verification happens in the Worker, not the DO, so a forged or expired ticket costs one Worker request and never wakes a Durable Object.

## Workspace Lifecycle

A workspace is openable only inside a window derived from its `start_time`, opened by a deliberate act of its host inside that window, and deleted in full — Durable Object, R2 images and the Supabase row — once the window closes. `lib/workspaceLifecycle.ts` is the single source of truth and is imported by the API routes and the dashboard alike; nothing else may compute these boundaries.

Two derived columns carry the window, both written **only** by workspace-create and workspace-PATCH:

```
opens_at   = start_time − leadMs        (null when start_time is null)
expires_at = start_time + retentionMs   (creation time when start_time is null)
```

A third column, `opened_at`, records that the host actually entered. It is nullable, monotonic, and written **only** by `realtime-auth`.

- **The deadline is stored, not derived at query time, because both durations are paid-plan variables.** Both write paths resolve the host's entitlements and pass them in — see [docs/plans.md](plans.md). The cron stays one indexed `.lt("expires_at", now)` however many tiers exist. Do not move the arithmetic into the cron; that reintroduces a per-room plan lookup on a 500-row batch.
- **A plan change reaches rows already written, through `reconcilePlanChange` and nothing else.** It is the third writer of these two columns and the only one that touches rooms it is not creating: it rewrites `expires_at` on every hosted unexpired room, and `opens_at` only where `opened_at` is null. Both directions apply — an upgrade extends retention on existing boards, a downgrade shortens it, floored so a cancellation can never delete the same night. The arithmetic lives in `lib/plans/reconcile.ts`; do not duplicate it here.
- **A schedule more than 90 days out is refused at validation** (`MAX_SCHEDULE_AHEAD_MS`). It is a sanity bound, not an abuse control — `realtime-auth` refusing a lapsed host's tickets is what actually stops a year of pre-booked lessons outliving the subscription that paid for them.
- **A NULL `expires_at` is invisible to the cron** (Postgres `lt` excludes NULL), which is what makes the columns safe to add ahead of any backfill. It also means a row that somehow escapes both write paths is immortal — if the DB-side `upsert_room` RPC is ever changed to insert rather than update, it must set `expires_at`.
- **No start time means no access and a same-night deletion.** `expires_at` is set to the creation time, so the next 05:00 run sweeps it. The modal warns on both the Schedule and Review steps.
- **`opens_at` decides access, `opened_at` decides the lock.** They were the same comparison until the two jobs were split, and that coupling was a bug: `leadMs` is a tier variable, so a Professional host's start time froze three days out and a Basic host's one hour out — paying more bought less editing freedom. `opens_at` now means only "the host may open this"; it must never be read as a lock again.
- **`startTimeLockReason` is the whole rule**: `opened` when `opened_at` is set, `started` once `now >= start_time`, whichever lands first. The second half is not optional — `start_time` drives `expires_at`, so a workspace that stayed reschedulable forever would let a host stretch retention indefinitely by nudging the time. `isStartTimeLocked` is a thin `!== null` over it; `ScheduleStep` uses the reason itself, because "already opened" and "start time has passed" need different copy.
- The lock uses the bare `start_time` while `lifecyclePhase`'s `past` keeps `DASHBOARD_GRACE_MS`, so for ten minutes after the start an unopened room reads `Ready to open` with its picker already frozen. Extending the lock by the grace would hand back a ten-minute window in which `expires_at` could still be pushed out.
- **The lock reads stored values, never incoming ones.** PATCH 409s on a change with `{ reason: "start-time-opened" | "start-time-started" }`. It must compare _parsed instants_ against the stored `start_time` and let an unchanged value through — `WorkspaceModal` sends all five fields on every save, so a value comparison is the only thing that lets a locked workspace's feedback still be edited. `sameInstant` exists for this; string equality fails because the modal round-trips through `toISOString()` and Postgres returns a different format. The 409 is genuinely reachable — a host can open the board in a second tab while the edit modal sits open — which is why `responseDenialCopy` reads 409 as well as 403.
- **A start time inside the opening window is allowed**, so an ad-hoc "lesson now" works. It no longer needs a save-time confirmation, because the workspace is merely openable, not opened; `ScheduleStep` says so in a muted notice and `opensImmediately` is the only thing that still asks the question.
- **Deletion is indifferent to activity.** `last_activity_at` is still written by `realtime-auth` but no longer drives anything; a room drawn in on day 13 still dies on day 14, feedback included. That determinism is what makes the window priceable.

**Opening is host-gated, and `realtime-auth` is the authority.**

- **A member who is not the host is held at `awaiting-host` until `opened_at` is set.** That is what makes the confirmation honest: nothing but the host's own action can freeze the start time.
- **Opening and joining are the same act.** The host's first successful ticket sets `opened_at`, so typing the `/board` URL cannot skip it. `useJoinWorkspace` shows `OpenWorkspaceDialog` first, but it is a warning, not the write path — there is deliberately no open endpoint to drift from it.
- The write is `.update(...).eq("id", room).is("opened_at", null)`, so concurrent host tabs are idempotent and the query fires once in a room's life. Unlike `evictRoomMembers` it is **not** silently best-effort: a swallowed failure is a room that never locks, so it reports through `reportError`.
- The dialog is suppressed once `isStartTimeLocked` is already true — telling a host they are about to lose a reschedule they have already lost would be a lie.
- The cost of the gate is that a host who never opens blocks their students indefinitely. Their own row reads `Ready to open`, which is what makes it discoverable.

```sql
alter table "Room" add column opened_at timestamptz;
```

**No backfill was run, deliberately.** The `now >= start_time` half of the lock rule already covers every past room, so the only rows a NULL changes are ones sitting inside their lead window at deploy time — and unlocking those is the point of the change.
- `lifecyclePhase` / `lifecycleStatus` / `joinDenialLabel` drive the dashboard's Status column, its disabled Join action and the mobile row dot, so all three agree by construction. They take `now` as an argument rather than reading the clock, and the dashboard feeds them `hooks/useNow.tsx` on a 60-second tick — `DashboardClient` previously froze `now` at mount, so no boundary ever advanced on an open page.
- **The ladder is `Ready in 3 days` → `Ready to open` → `Open` → `Deletes in 12 days`.** Nothing opens on a schedule any more, so the `scheduled` label names availability rather than an event. `past` keeps precedence over both `ready` and `open`, so an opened lesson still counts down to deletion once its slot is behind it.
- **`lifecycleStatus` and `joinDenialLabel` take `viewerIsHost` before `now`.** The `ready` phase is the only one that splits — `Ready to open` (green) for the host, `Waiting for tutor` (amber) for everyone else — but the argument is required rather than defaulted so a call site has to decide. Pass `isHost(...)`, not a `canManage` flag: those also demand the `tutor` role, and the status a student sees must not depend on their own role.
