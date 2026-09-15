# Plans, Entitlements & Usage

Every paid limit in the app resolves through one server-only table. **Supabase `user_plans` is the single source of truth for a user's plan**; Clerk `publicMetadata` holds `role` and nothing else. Role is *what you may do*, plan is *how much* — a student has a role and no plan row at all.

## Where the numbers live

`lib/plans/entitlements.ts` holds all three tiers side by side and is the **only file to edit when dialling values in**. It carries `import "server-only"`, so a client import is a build error rather than a convention — the entitlement table must never be bundled to the browser.

```ts
PlanEntitlements = {
    maxWorkspaceMembers   // includes the host
    workspacesPerMonth    // null = unlimited
    maxLinkedStudents     // null = unlimited
    retentionMs           // always finite, never null
    leadMs
}
```

- **`null` means unlimited**, and only `workspacesPerMonth` and `maxLinkedStudents` may use it. Retention is deliberately always a number: "kept forever" is not a tier, because storage that never expires has no ceiling.
- **`maxWorkspaceMembers` counts the host.** Basic's 2 is a 1:1 lesson. Every call site compares against the deduped `user_ids` array *after* the host is merged in, so the two can never drift.
- `types/planTypes.ts` holds the types only. Types erase, so it is safe to import from a client component; the values are not.

## Resolution

`lib/serverPlan.ts` mirrors `lib/roles.ts` / `lib/serverRole.ts`:

- `getUserPlan` — one indexed PK lookup, wrapped in React `cache()` so a server render checking entitlements twice costs one query.
- `entitlementsForUser` — returns `null` unless a row exists **and** its status grants entitlements.
- `requireEntitlements` — the API-route guard, returning a 403 `{ reason: "no-plan" }`.

**`past_due` grants, `unpaid` does not.** Stripe retries a failed card for two to three weeks before giving up, and a single expired card must not sever a tutor mid-term. `past_due` is that retry window and keeps every entitlement; the cut lands at `unpaid` or `cancelled`, which are the states that mean dunning is over. Treating `past_due` as no plan — which is what this table used to do — turned one bounced payment into an instant loss of access for the tutor *and* every student booked with them.

**A Supabase error is reported and then treated as no plan.** Failing closed is correct for a paid boundary, and the `error_logs` row is what makes an outage diagnosable rather than silent.

**There is no free tier and no default plan.** A user with no row cannot create a workspace. That will lock you out after a database reset, so the seed is kept at the bottom of this file.

## Enforcement points

| Entitlement | Enforced in | Denial |
| --- | --- | --- |
| `maxWorkspaceMembers` | `app/api/workspaces/route.ts`, `[workspaceId]/route.ts` | 403 `{ reason: "members" }` |
| `workspacesPerMonth` | `app/api/workspaces/route.ts` via `increment_usage` | 403 `{ reason: "quota", used, limit, resetsAt }` |
| `maxLinkedStudents` | `app/api/links/redeem/route.ts`, `links/[linkId]` PATCH | 403 `{ reason: "linked-students" }` |
| `retentionMs` / `leadMs` | `scheduleWindow`, at create and PATCH, and `reconcilePlanChange` | — |
| any granting plan | `app/api/realtime-auth/route.ts` | 403 `{ reason: "host-no-plan" }` |
| `MAX_SCHEDULE_AHEAD_MS` | `validateWorkspaceBody` | 400 `{ reason: "horizon" }` |
| live member count | `realtime/src/BoardRoom.ts` | close code 4004 |

- **`leadMs` sets how early a host *may* open a workspace, and nothing else.** It used to drive the start-time lock as well, which made a longer lead read as a downgrade — three days of frozen start time on Professional against one hour on Basic. The lock now hangs off `opened_at`; see [docs/access-control.md](access-control.md). Keep any future window variable on the access side of that line.
- **PATCH resolves entitlements lazily**, only when `collaborators` changes or an unlocked `startTime` needs the window recomputed. A host whose plan has lapsed can still write feedback on a past lesson — the same care that `sameInstant` exists for.
- **The quota claims before the insert and releases on failure.** The counter is the authority, so it must claim before the work it authorises, exactly like the invite compare-and-swap in `links/redeem`. Worst case is one lost workspace on a Supabase error; the alternative is a cap two concurrent requests walk straight through.
- **The links cap is the tutor's, whoever redeems.** It is checked inside the read-only block *before* the CAS claim, so a capped redeem never burns the other side's code. Two concurrent redeems can overshoot by one; `links:redeem` at 5 per 10 minutes makes that acceptable, and a trigger would be the fix if it ever isn't.
- **Deleting a workspace does not refund quota.** Otherwise create-and-delete churn farms it.
- **The quota period is the billing period, not the calendar month.** `usagePeriod` reads `current_period_start` / `current_period_end` off the plan row and falls back to the calendar month only when they are absent or inconsistent. Anchoring on the month handed a tutor who subscribed on the 25th the tail of one month plus the whole of the next inside a single billing cycle — up to twice the allowance, every first month. `usage_counters.period_start` is still a `date`, so the anchor is the UTC date of `current_period_start` and a new period is still a new row with no reset job. Read `current_period_start` from Stripe rather than recomputing a day-of-month: an anchor on the 31st bills on the 28th in February and a recomputed date drifts away from the invoice.
- **Do not pass `billing_cycle_anchor: 'now'` when switching plans.** Stripe preserves the anchor across a `subscription.update` by default, which is what stops an upgrade minting a fresh quota. Cancel-and-resubscribe does start a new period and a new allowance, but the user pays another subscription fee for it, so it buys capacity at list price rather than exploiting anything. That stops being true the moment prorated refunds are offered — the monotonic floor in the TODO's Hardening section is the fix if it ever is.

## Plan changes

A plan change is a **hard cut**: the new tier's limits apply to everything the user already has, not just to what they create next. Three of the five entitlements used to be baked into a row at write time and never revisited — `retentionMs` and `leadMs` as `expires_at` / `opens_at` on the `Room`, and `maxLinkedStudents` as a count checked once at redeem — so a downgrade left the old tier's terms in place indefinitely and an upgrade never reached rows already written.

`reconcilePlanChange(userId)` in `lib/plans/reconcile.ts` is the single entry point that closes that gap. It is called by hand today through `POST /api/admin/reconcile-plan` and will be called by the Stripe webhook later; nothing else should replicate its arithmetic.

**Timing is the billing boundary, not the click.** Upgrades take effect immediately — the user has paid for them. Downgrades and cancellations are scheduled to `current_period_end` and reconcile fires then, because revoking a tier someone is paid up for is taking back a service already bought. The pre-downgrade screen therefore names a date and the exact list of what changes on it.

### What reconcile touches

- **`expires_at`** on every hosted, unexpired room with a start time. Upgrade (the new expiry is later) writes `start_time + retentionMs` unchanged. Downgrade and cancellation write `max(start_time + retentionMs, min(existing expires_at, now + RETENTION_FLOOR_MS))`.
- **`opens_at`**, recomputed from the new `leadMs` — but **only where `opened_at` is null**. Pushing `opens_at` forward on a room already in progress makes `boardAccessDenial` return `not-open` and throws everyone out mid-lesson.
- **`tutor_links.deactivated_at`**, soft-locking the newest links above the cap and reactivating the oldest inactive ones into any new headroom.
- Rooms whose `user_ids` exceed the new member cap are **counted and returned, never written**.

**The retention floor is the one place the cut is deliberately not hard.** Without it, cancelling sets `expires_at` in the past on every room and the next cron run destroys every board, stroke and R2 image that night. Revoking access is reversible — resubscribe and everything works — but deletion is not, and it lands on student data belonging to people who had no part in the decision. The realistic trigger is a mis-click or an expired card, not abuse. Thirty days of storage on a churned tutor is also the best reactivation lever there is.

**The floor must never extend.** `min(existing, now + floor)` is what stops a board thirteen days into Basic's fourteen-day retention being pushed out to thirty *because* its host cancelled. Never sooner than the floor, never later than what they already had.

### What reconcile deliberately does not touch

**Over-cap member lists are flagged, not trimmed.** A Plus tutor who downgrades to Basic keeps all five `user_ids` on a scheduled room. The Durable Object cap is the real ceiling, so no seats leak — but it admits `cap - 1` non-hosts first-come, which means whichever student clicks first gets in and the rest hit `/forbidden?reason=full`. That is a race, not a limit, so `WorkspaceTableRow` shows an **Over limit** badge on the host's own upcoming rows naming how many to remove. PATCH already refuses any `collaborators` array still above the cap, so the resolution has to come all the way down in one edit.

**Links are deactivated, never deleted.** `deactivated_at` is reversible and survives a re-upgrade; deleting would sever a relationship that can only be rebuilt through an out-of-band code exchange with a person who may not answer. Inactive links stay visible on the connections page behind an **Inactive** badge, stop counting toward the cap, and can be swapped one-for-one by the tutor through `PATCH /api/links/[linkId]` — which re-checks the cap, so a swap can never raise the active count. Reconcile keeps the **oldest** links active because that ordering is stable and reversible, not because it is necessarily the right roster; the tutor is expected to correct it.

**No plan means a cap of zero**, so a cancellation deactivates every link. A resubscribe to the same tier reactivates the same number, oldest-first — a clean round trip, though it does not remember a hand-picked roster.

### Board access is gated live

`realtime-auth` resolves the host's plan (it already did, to size the ticket cap) and now **refuses the ticket entirely** when nothing grants, with `{ reason: "host-no-plan" }`. Without this, a tutor could buy one month, schedule a year of lessons, cancel, and keep every board openable until `expires_at` — the single largest way to get more than you pay for. `MAX_SCHEDULE_AHEAD_MS` caps scheduling at 90 days as a sanity bound on top; once access is checked live the horizon is no longer the abuse control, which is why it stays flat rather than clamping to `current_period_end`. A monthly subscriber booking a term of lessons is normal.

**A lesson in progress finishes.** `lessonInFlight` — `opened_at` set and `now < start_time + DASHBOARD_GRACE_MS` — exempts the room from the gate. Tickets last 60 seconds and `realtime-auth` runs on every reconnect, so without the carve-out a status flip mid-lesson would bounce the next person whose connection hiccups, permanently.

Students see the consequence before they walk into it: `/api/users/workspaces` annotates each row with `host_has_plan` from **one batched `user_plans` query** for every host on the list, and `lifecycleStatus` / `joinDenialLabel` read it to render "Tutor's plan ended" instead of "Ready to open". `/forbidden` carries matching copy. The student did nothing wrong, so none of that copy blames them.

## The Durable Object backstop

The write-time member cap only binds when a workspace is written. A downgrade leaves rooms whose `user_ids` exceed the new cap, so the live count is enforced independently.

- **The cap travels in the signed ticket** (`TicketClaims.cap`, plus `host`). `realtime-auth` resolves the *host's* plan — never the joiner's — and signs it; `verifyTicket` covers it with the same HMAC. The Worker and the DO never look a plan up.
- **`verifyTicket` fails closed on a missing or non-positive cap.** Absence means a partial deploy or a signing bug, never "unlimited". Every tier caps members at a finite number, so an unlimited tier would have to encode that explicitly here rather than by omission.
- **The DO counts distinct users, not sockets** — `MAX_CONNECTIONS_PER_USER` already allows one person three tabs, and those must not consume three seats.
- **The host holds a reserved slot** and bypasses the check, so a tutor who drops connection can always re-enter their own full room. Non-host capacity is therefore `cap - 1`.
- **A refused joiner gets close code 4004, not an HTTP error.** A browser cannot read a status off a failed WebSocket handshake, so the DO accepts the socket and closes it immediately with `ROOM_FULL_CLOSE_CODE`. `client.ts` stops reconnecting on that code and routes to `/forbidden?reason=full`; without it, a full room would be an infinite reconnect loop.
- If the host has no active plan, the ticket is signed with the room's **current member count**. That path is now only reachable inside the `lessonInFlight` carve-out, since every other no-plan request is refused before the cap is computed. A lapsed plan cannot grow the list — PATCH requires entitlements — so the list length is a safe ceiling for the minutes it takes a lesson already under way to finish.

## Client plumbing

Entitlements are resolved server-side in `app/dashboard/page.tsx` and passed to `DashboardClient`, which publishes them through `hooks/useEntitlements.tsx`. A context rather than props because `WorkspaceModal` is rendered from four places (`Sidebar`, `TabBar`, `WorkspaceTableRow`, `mobile/WorkspaceRow`).

The numbers do reach the browser — the picker renders `2 / 2` and `ScheduleStep` needs `leadMs` for its opens-immediately notice. **That is display, not authority**: editing them in devtools achieves nothing, because create, PATCH and redeem all re-check. What must never reach the client is the *table* of all three tiers.

`ENVIRONMENT=testing` renders the dashboard from `data/testWorkspaces.json` against a fixed `TEST_LIMITS`, not a plan lookup — the test path has no real user to resolve.

### The tier badge in the sidebar

`Sidebar` renders the tier as a `highlight` `Badge` inline after the product name — "Chalkie Chalkie `[Plus]`". `highlight` was added to `components/ui/badge.tsx` for this: `#46a2db` text on a `/10` fill behind a `/20` border, and `rounded-full` instead of the tag-tier rounding the other variants carry — a deliberate pill, and the one variant holding a literal colour rather than a semantic token. It travels as a `planId` prop, **not through `useEntitlements`**, because `ConnectionsClient` renders the same `Sidebar` and has no `EntitlementsProvider` — a context-based tier would blank out on `/dashboard/connections`. Both pages resolve it, mirroring how `role` already reaches the sidebar.

- **`grantedPlanForUser` is the resolver**, not `entitlementsForUser` — the latter discards `userPlan.plan` and returns only numbers. It applies the same `statusGrantsEntitlements` filter, so `past_due` and `cancelled` render no badge at all. A visible badge therefore always means a plan that currently works; it must never sit above a create button that 403s.
- It shares `getUserPlan`'s React `cache()`, so resolving tier and entitlements on the same render is still one query.
- `PLAN_LABELS` in `lib/plans/labels.ts` maps `professional` to the short **"Pro"**, keeping the name and badge on one `text-nowrap` line inside a 300px sidebar. That file is deliberately **not** `server-only` — it holds display names, no entitlement values, and the client needs it.
- Students and admins have no plan row, so the fallback covers them without a role check.
- The tier is expanded-sidebar only. It sits inside the identity block, which is already hidden on the collapsed rail, and mobile renders `Navbar` instead of `Sidebar`.

## Schema

```sql
create table user_plans (
    user_id                text primary key,
    plan                   text not null check (plan in ('basic', 'plus', 'professional')),
    status                 text not null check (status in ('active', 'trialing', 'past_due', 'unpaid', 'cancelled')),
    trial_ends_at          timestamptz,
    current_period_start   timestamptz,
    current_period_end     timestamptz,
    stripe_customer_id     text,
    stripe_subscription_id text,
    updated_at             timestamptz not null default now()
);

create table usage_counters (
    user_id      text not null,
    period_start date not null,
    metric       text not null,
    count        int  not null default 0,
    primary key (user_id, period_start, metric)
);

create or replace function increment_usage(
    p_user_id      text,
    p_period_start date,
    p_metric       text,
    p_limit        int
) returns table (allowed boolean, used int)
language plpgsql
as $$
declare
    v_count int;
begin
    if p_limit is not null and p_limit <= 0 then
        return query select false, 0;
        return;
    end if;

    insert into usage_counters (user_id, period_start, metric, count)
    values (p_user_id, p_period_start, p_metric, 1)
    on conflict (user_id, period_start, metric) do update
        set count = usage_counters.count + 1
        where p_limit is null or usage_counters.count < p_limit
    returning usage_counters.count into v_count;

    if v_count is not null then
        return query select true, v_count;
        return;
    end if;

    select c.count into v_count
    from usage_counters c
    where c.user_id = p_user_id
      and c.period_start = p_period_start
      and c.metric = p_metric;

    return query select false, coalesce(v_count, 0);
end;
$$;

create or replace function release_usage(
    p_user_id      text,
    p_period_start date,
    p_metric       text
) returns void
language sql
as $$
    update usage_counters
    set count = greatest(count - 1, 0)
    where user_id = p_user_id
      and period_start = p_period_start
      and metric = p_metric;
$$;
```

**The check-and-increment is one statement on purpose.** The `where` on the `on conflict do update` is what makes the limit atomic; a read-then-write in TypeScript lets two concurrent creates past a full quota, and `workspace:create` at 3/min only narrows that window rather than closing it.

`period_start` is the UTC date the billing period opened, so a new period is a new row and the reset needs no job.

### Migration for the hard-cut change

```sql
alter table user_plans add column current_period_start timestamptz;

alter table user_plans drop constraint user_plans_status_check;
alter table user_plans add constraint user_plans_status_check
    check (status in ('active', 'trialing', 'past_due', 'unpaid', 'cancelled'));

alter table tutor_links add column deactivated_at timestamptz;
create index tutor_links_active_idx on tutor_links (tutor_id, deactivated_at);

create index room_host_id_idx on "Room" (host_id);
```

**No backfill.** A null `current_period_start` falls back to the calendar month, so existing rows keep working until Stripe writes one. A null `deactivated_at` is an active link, which is what every existing row should be. The `Room(host_id)` index is what keeps reconcile from sequential-scanning on every plan change.

## Seeding your own account

```sql
insert into user_plans (user_id, plan, status)
values ('user_xxx', 'professional', 'active')
on conflict (user_id) do update
    set plan = excluded.plan, status = excluded.status, updated_at = now();
```

## Deploying

Both sides ship together — the ticket carries `cap`, and the Worker rejects a ticket without one. Deploy Vercel and `wrangler deploy` in the same window, and remember `npm run build` does not typecheck the Worker (`cd realtime && npm run typecheck`).

Testing the DO backstop needs separate Clerk accounts, not tabs, and a simulated downgrade — create the room under Professional, then `update user_plans set plan = 'basic'` and reconnect. Normal use cannot reach that path, because the write-time cap stops the oversized room existing in the first place.

### Running reconcile by hand

Nothing writes `user_plans` yet, so a plan change is a `update user_plans set plan = ...` followed by a reconcile. `POST /api/admin/reconcile-plan` takes `{ "userId": "user_xxx" }` and is guarded by `requireAdmin` — an exact role match, so a tutor account cannot call it. It is deliberately not rate limited.

Clerk authenticates it by session cookie, so the least friction is `fetch("/api/admin/reconcile-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "user_xxx" }) })` from the browser console while signed in as admin. From a terminal, curl it with the `__session` cookie copied out of devtools. It returns a summary — rooms rewindowed, links deactivated and reactivated, and the ids of any rooms left over the member cap.
