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
- `entitlementsForUser` — returns `null` unless a row exists **and** its status grants entitlements (`active` or `trialing`; `past_due` and `cancelled` do not).
- `requireEntitlements` — the API-route guard, returning a 403 `{ reason: "no-plan" }`.

**A Supabase error is reported and then treated as no plan.** Failing closed is correct for a paid boundary, and the `error_logs` row is what makes an outage diagnosable rather than silent.

**There is no free tier and no default plan.** A user with no row cannot create a workspace. That will lock you out after a database reset, so the seed is kept at the bottom of this file.

## Enforcement points

| Entitlement | Enforced in | Denial |
| --- | --- | --- |
| `maxWorkspaceMembers` | `app/api/workspaces/route.ts`, `[workspaceId]/route.ts` | 403 `{ reason: "members" }` |
| `workspacesPerMonth` | `app/api/workspaces/route.ts` via `increment_usage` | 403 `{ reason: "quota", used, limit, resetsAt }` |
| `maxLinkedStudents` | `app/api/links/redeem/route.ts` | 403 `{ reason: "linked-students" }` |
| `retentionMs` / `leadMs` | `scheduleWindow`, at create and PATCH | — |
| live member count | `realtime/src/BoardRoom.ts` | close code 4004 |

- **`leadMs` sets how early a host *may* open a workspace, and nothing else.** It used to drive the start-time lock as well, which made a longer lead read as a downgrade — three days of frozen start time on Professional against one hour on Basic. The lock now hangs off `opened_at`; see [docs/access-control.md](access-control.md). Keep any future window variable on the access side of that line.
- **PATCH resolves entitlements lazily**, only when `collaborators` changes or an unlocked `startTime` needs the window recomputed. A host whose plan has lapsed can still write feedback on a past lesson — the same care that `sameInstant` exists for.
- **The quota claims before the insert and releases on failure.** The counter is the authority, so it must claim before the work it authorises, exactly like the invite compare-and-swap in `links/redeem`. Worst case is one lost workspace on a Supabase error; the alternative is a cap two concurrent requests walk straight through.
- **The links cap is the tutor's, whoever redeems.** It is checked inside the read-only block *before* the CAS claim, so a capped redeem never burns the other side's code. Two concurrent redeems can overshoot by one; `links:redeem` at 5 per 10 minutes makes that acceptable, and a trigger would be the fix if it ever isn't.
- **Deleting a workspace does not refund quota.** Otherwise create-and-delete churn farms it.

## The Durable Object backstop

The write-time member cap only binds when a workspace is written. A downgrade leaves rooms whose `user_ids` exceed the new cap, so the live count is enforced independently.

- **The cap travels in the signed ticket** (`TicketClaims.cap`, plus `host`). `realtime-auth` resolves the *host's* plan — never the joiner's — and signs it; `verifyTicket` covers it with the same HMAC. The Worker and the DO never look a plan up.
- **`verifyTicket` fails closed on a missing or non-positive cap.** Absence means a partial deploy or a signing bug, never "unlimited". Every tier caps members at a finite number, so an unlimited tier would have to encode that explicitly here rather than by omission.
- **The DO counts distinct users, not sockets** — `MAX_CONNECTIONS_PER_USER` already allows one person three tabs, and those must not consume three seats.
- **The host holds a reserved slot** and bypasses the check, so a tutor who drops connection can always re-enter their own full room. Non-host capacity is therefore `cap - 1`.
- **A refused joiner gets close code 4004, not an HTTP error.** A browser cannot read a status off a failed WebSocket handshake, so the DO accepts the socket and closes it immediately with `ROOM_FULL_CLOSE_CODE`. `client.ts` stops reconnecting on that code and routes to `/forbidden?reason=full`; without it, a full room would be an infinite reconnect loop.
- If the host has no active plan, the ticket is signed with the room's **current member count**. A lapsed plan cannot grow the list — PATCH requires entitlements — so the list length is a safe ceiling, and students are not locked out of a lesson their tutor already paid for.

## Client plumbing

Entitlements are resolved server-side in `app/dashboard/page.tsx` and passed to `DashboardClient`, which publishes them through `hooks/useEntitlements.tsx`. A context rather than props because `WorkspaceModal` is rendered from four places (`Sidebar`, `TabBar`, `WorkspaceTableRow`, `mobile/WorkspaceRow`).

The numbers do reach the browser — the picker renders `2 / 2` and `ScheduleStep` needs `leadMs` for its opens-immediately notice. **That is display, not authority**: editing them in devtools achieves nothing, because create, PATCH and redeem all re-check. What must never reach the client is the *table* of all three tiers.

`ENVIRONMENT=testing` renders the dashboard from `data/testWorkspaces.json` against a fixed `TEST_LIMITS`, not a plan lookup — the test path has no real user to resolve.

### The tier name in the sidebar

`Sidebar` renders the tier after the product name — "Chalkie Chalkie **Plus**", the tier in `.gradient-text`. It travels as a `planId` prop, **not through `useEntitlements`**, because `ConnectionsClient` renders the same `Sidebar` and has no `EntitlementsProvider` — a context-based tier would blank out on `/dashboard/connections`. Both pages resolve it, mirroring how `role` already reaches the sidebar.

- **`grantedPlanForUser` is the resolver**, not `entitlementsForUser` — the latter discards `userPlan.plan` and returns only numbers. It applies the same `statusGrantsEntitlements` filter, so `past_due` and `cancelled` fall back to a bare "Chalkie Chalkie". A gradient tier therefore always means a plan that currently works; it must never sit above a create button that 403s.
- It shares `getUserPlan`'s React `cache()`, so resolving tier and entitlements on the same render is still one query.
- `PLAN_LABELS` in `lib/plans/labels.ts` maps `professional` to the short **"Pro"**, keeping a `text-nowrap` line inside a 300px sidebar. That file is deliberately **not** `server-only` — it holds display names, no entitlement values, and the client needs it.
- Students and admins have no plan row, so the fallback covers them without a role check.
- The tier is expanded-sidebar only. It sits inside the identity block, which is already hidden on the collapsed rail, and mobile renders `Navbar` instead of `Sidebar`.

## Schema

```sql
create table user_plans (
    user_id                text primary key,
    plan                   text not null check (plan in ('basic', 'plus', 'professional')),
    status                 text not null check (status in ('active', 'trialing', 'past_due', 'cancelled')),
    trial_ends_at          timestamptz,
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

`period_start` is the first of the calendar month in UTC, so a new period is a new row and the reset needs no job.

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
