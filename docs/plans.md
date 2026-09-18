# Plans, Entitlements & Usage

Every paid limit in the app resolves through one server-only table. **Supabase `user_plans` is the single source of truth for a user's plan**, and the Stripe webhook is the only thing that writes it; Clerk `publicMetadata` holds `role` and nothing else. Role is _what you may do_, plan is _how much_ — a student has a role and no plan row at all.

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
- **`maxWorkspaceMembers` counts the host.** Basic's 2 is a 1:1 lesson. Every call site compares against the deduped `user_ids` array _after_ the host is merged in, so the two can never drift.
- `types/planTypes.ts` holds the types only. Types erase, so it is safe to import from a client component; the values are not.

## Resolution

`lib/serverPlan.ts` mirrors `lib/roles.ts` / `lib/serverRole.ts`:

- `getUserPlan` — one indexed PK lookup, wrapped in React `cache()` so a server render checking entitlements twice costs one query.
- `entitlementsForUser` — returns `null` unless a row exists **and** its status grants entitlements.
- `requireEntitlements` — the API-route guard, returning a 403 `{ reason: "no-plan" }`.

**`past_due` grants, `unpaid` does not.** Stripe retries a failed card for two to three weeks before giving up, and a single expired card must not sever a tutor mid-term. `past_due` is that retry window and keeps every entitlement; the cut lands at `unpaid` or `cancelled`, which are the states that mean dunning is over. Treating `past_due` as no plan — which is what this table used to do — turned one bounced payment into an instant loss of access for the tutor _and_ every student booked with them.

**A Supabase error is reported and then treated as no plan.** Failing closed is correct for a paid boundary, and the `error_logs` row is what makes an outage diagnosable rather than silent.

**There is no free tier and no default plan.** A user with no row cannot create a workspace. That will lock you out after a database reset, so the seed is kept at the bottom of this file.

## Enforcement points

| Entitlement              | Enforced in                                                      | Denial                                           |
| ------------------------ | ---------------------------------------------------------------- | ------------------------------------------------ |
| `maxWorkspaceMembers`    | `app/api/workspaces/route.ts`, `[workspaceId]/route.ts`          | 403 `{ reason: "members" }`                      |
| `workspacesPerMonth`     | `app/api/workspaces/route.ts` via `increment_usage`              | 403 `{ reason: "quota", used, limit, resetsAt }` |
| `maxLinkedStudents`      | `app/api/links/redeem/route.ts`, `links/[linkId]` PATCH          | 403 `{ reason: "linked-students" }`              |
| `retentionMs` / `leadMs` | `scheduleWindow`, at create and PATCH, and `reconcilePlanChange` | —                                                |
| any granting plan        | `app/api/realtime-auth/route.ts`                                 | 403 `{ reason: "host-no-plan" }`                 |
| `MAX_SCHEDULE_AHEAD_MS`  | `validateWorkspaceBody`, and the `ScheduleStep` picker cap       | 400 `{ reason: "horizon" }`                      |
| live member count        | `realtime/src/BoardRoom.ts`                                      | close code 4004                                  |

- **`leadMs` sets how early a host _may_ open a workspace, and nothing else.** It used to drive the start-time lock as well, which made a longer lead read as a downgrade — three days of frozen start time on Professional against one hour on Basic. The lock now hangs off `opened_at`; see [docs/access-control.md](access-control.md). Keep any future window variable on the access side of that line.
- **PATCH resolves entitlements lazily**, only when `collaborators` changes or an unlocked `startTime` needs the window recomputed. A host whose plan has lapsed can still write feedback on a past lesson — the same care that `sameInstant` exists for.
- **The quota claims before the insert and releases on failure.** The counter is the authority, so it must claim before the work it authorises, exactly like the invite compare-and-swap in `links/redeem`. Worst case is one lost workspace on a Supabase error; the alternative is a cap two concurrent requests walk straight through.
- **The links cap is the tutor's, whoever redeems.** It is checked inside the read-only block _before_ the CAS claim, so a capped redeem never burns the other side's code. Two concurrent redeems can overshoot by one; `links:redeem` at 5 per 10 minutes makes that acceptable, and a trigger would be the fix if it ever isn't.
- **Deleting a workspace does not refund quota.** Otherwise create-and-delete churn farms it.
- **The quota period is the billing period, not the calendar month.** `usagePeriod` reads `current_period_start` / `current_period_end` off the plan row and falls back to the calendar month only when they are absent or inconsistent. Anchoring on the month handed a tutor who subscribed on the 25th the tail of one month plus the whole of the next inside a single billing cycle — up to twice the allowance, every first month. `usage_counters.period_start` is still a `date`, so the anchor is the UTC date of `current_period_start` and a new period is still a new row with no reset job. Read `current_period_start` from Stripe rather than recomputing a day-of-month: an anchor on the 31st bills on the 28th in February and a recomputed date drifts away from the invoice.
- **Do not pass `billing_cycle_anchor: 'now'` when switching plans.** Stripe preserves the anchor across a `subscription.update` by default, which is what stops an upgrade minting a fresh quota. Cancel-and-resubscribe does start a new period and a new allowance, but the user pays another subscription fee for it, so it buys capacity at list price rather than exploiting anything. That stops being true the moment prorated refunds are offered — the monotonic floor in the TODO's Hardening section is the fix if it ever is.

## Plan changes

A plan change is a **hard cut**: the new tier's limits apply to everything the user already has, not just to what they create next. Three of the five entitlements used to be baked into a row at write time and never revisited — `retentionMs` and `leadMs` as `expires_at` / `opens_at` on the `Room`, and `maxLinkedStudents` as a count checked once at redeem — so a downgrade left the old tier's terms in place indefinitely and an upgrade never reached rows already written.

`reconcilePlanChange(userId)` in `lib/plans/reconcile.ts` is the single entry point that closes that gap. The Stripe webhook reaches it through `syncSubscription`, and `POST /api/admin/reconcile-plan` still calls it by hand; nothing else should replicate its arithmetic.

**Timing is the billing boundary, not the click.** Upgrades take effect immediately — the user has paid for them. Downgrades and cancellations are scheduled to `current_period_end` and reconcile fires then, because revoking a tier someone is paid up for is taking back a service already bought. The pre-downgrade screen therefore names a date and the exact list of what changes on it.

### What reconcile touches

- **`expires_at`** on every hosted, unexpired room with a start time. Upgrade (the new expiry is later) writes `start_time + retentionMs` unchanged. Downgrade and cancellation write `max(start_time + retentionMs, min(existing expires_at, now + RETENTION_FLOOR_MS))`.
- **`opens_at`**, recomputed from the new `leadMs` — but **only where `opened_at` is null**. Pushing `opens_at` forward on a room already in progress makes `boardAccessDenial` return `not-open` and throws everyone out mid-lesson.
- **`tutor_links.deactivated_at`**, soft-locking the newest links above the cap and reactivating the oldest inactive ones into any new headroom.
- Rooms whose `user_ids` exceed the new member cap are **counted and returned, never written**.

**The retention floor is the one place the cut is deliberately not hard.** Without it, cancelling sets `expires_at` in the past on every room and the next cron run destroys every board, stroke and R2 image that night. Revoking access is reversible — resubscribe and everything works — but deletion is not, and it lands on student data belonging to people who had no part in the decision. The realistic trigger is a mis-click or an expired card, not abuse. Thirty days of storage on a churned tutor is also the best reactivation lever there is.

**The floor must never extend.** `min(existing, now + floor)` is what stops a board thirteen days into Basic's fourteen-day retention being pushed out to thirty _because_ its host cancelled. Never sooner than the floor, never later than what they already had.

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

- **The cap travels in the signed ticket** (`TicketClaims.cap`, plus `host`). `realtime-auth` resolves the _host's_ plan — never the joiner's — and signs it; `verifyTicket` covers it with the same HMAC. The Worker and the DO never look a plan up.
- **`verifyTicket` fails closed on a missing or non-positive cap.** Absence means a partial deploy or a signing bug, never "unlimited". Every tier caps members at a finite number, so an unlimited tier would have to encode that explicitly here rather than by omission.
- **The DO counts distinct users, not sockets** — `MAX_CONNECTIONS_PER_USER` already allows one person three tabs, and those must not consume three seats.
- **The host holds a reserved slot** and bypasses the check, so a tutor who drops connection can always re-enter their own full room. Non-host capacity is therefore `cap - 1`.
- **A refused joiner gets close code 4004, not an HTTP error.** A browser cannot read a status off a failed WebSocket handshake, so the DO accepts the socket and closes it immediately with `ROOM_FULL_CLOSE_CODE`. `client.ts` stops reconnecting on that code and routes to `/forbidden?reason=full`; without it, a full room would be an infinite reconnect loop.
- If the host has no active plan, the ticket is signed with the room's **current member count**. That path is now only reachable inside the `lessonInFlight` carve-out, since every other no-plan request is refused before the cap is computed. A lapsed plan cannot grow the list — PATCH requires entitlements — so the list length is a safe ceiling for the minutes it takes a lesson already under way to finish.

## Client plumbing

Entitlements are resolved server-side in `app/dashboard/page.tsx` and passed to `DashboardClient`, which publishes them through `hooks/useEntitlements.tsx`. A context rather than props because `WorkspaceModal` is rendered from four places (`Sidebar`, `TabBar`, `WorkspaceTableRow`, `mobile/WorkspaceRow`).

`EntitlementsState` carries three things: `entitlements`, `usage` (the `workspaces_created` counter for the current period) and `linkedStudents` (the active `tutor_links` count, resolved by `countActiveStudentLinks` and only when entitlements exist). The dashboard's usage card is the first consumer of the latter two — see [docs/dashboard.md](dashboard.md) for when it renders and why it never counts `friends.length`.

The numbers do reach the browser — the picker renders `2 / 2` and `ScheduleStep` needs `leadMs` for its opens-immediately notice. **That is display, not authority**: editing them in devtools achieves nothing, because create, PATCH and redeem all re-check. What must never reach the client is the _table_ of all three tiers.

`ENVIRONMENT=testing` renders the dashboard from `data/testWorkspaces.json` against a fixed `TEST_LIMITS`, not a plan lookup — the test path has no real user to resolve.

### The tier badge on the usage card

`Usage` renders the tier as a `highlight` `Badge` opposite the "Your plan" heading. `highlight` was added to `components/ui/badge.tsx` for this: a solid `bg-brand` fill under `text-background` text, no border of its own, and the same tag-tier rounding every other variant carries. It is the only variant that _fills_ with a chromatic colour rather than tinting one — `destructive` and `success` sit at `/15` behind their own text colour — so it is the loudest label in the set. It travels as a `planId` prop through `DashboardClient`, **not through `useEntitlements`**, because `EntitlementsState` carries only numbers — the tier name is not one of them. `app/dashboard/page.tsx` is the only page that resolves it; nothing on `/dashboard/connections` names a tier.

- **`grantedPlanForUser` is the resolver**, not `entitlementsForUser` — the latter discards `userPlan.plan` and returns only numbers. It applies the same `statusGrantsEntitlements` filter, so `past_due` and `cancelled` render no badge at all. A visible badge therefore always means a plan that currently works; it must never sit above a create button that 403s.
- It shares `getUserPlan`'s React `cache()`, so resolving tier and entitlements on the same render is still one query.
- `PLAN_LABELS` in `lib/plans/labels.ts` maps `professional` to the short **"Pro"**. That file is deliberately **not** `server-only` — it holds display names, no entitlement values, and the client needs it.
- Students and admins have no plan row, so the fallback covers them without a role check — and the card itself never renders for them, since the gate is `entitlements !== null`.
- The same `planId` decides whether "Change plan" appears at all; see [docs/dashboard.md](dashboard.md) for why Professional gets no button.

## Stripe

Stripe is the **merchant of record**, through [Managed Payments](https://docs.stripe.com/payments/managed-payments): it calculates, collects and remits VAT in over 80 countries, and handles fraud, disputes and transaction-level support. Every Checkout Session sets `managed_payments: { enabled: true }`, and all three products carry `txcd_10103000` (SaaS – personal use) and show **Eligible** in the product catalogue — that flag is the precondition for the parameter doing anything.

Customers manage and cancel through **Onelink** (`link.com`) by default, which is where Managed Payments sends receipts and subscription emails from. That is why there is no customer portal here and no rush to build one.

`lib/stripe.ts` constructs the client with **no `apiVersion`**, so every call runs on the version the installed SDK pins. Do not pin one by hand. `managed_payments` is GA on that version and typed natively, and running two calls on a preview version while webhook payloads arrive on another is exactly how the field below gets read off the wrong object.

### The gotcha that breaks quota silently

`current_period_start` / `current_period_end` live **on the subscription item, not the subscription**: `subscription.items.data[0].current_period_start`. The Subscription object does not carry them at all any more. Read them from the wrong place and both columns land null, `usagePeriod` falls back to the calendar month, and every anchoring guarantee above quietly stops holding — with no error anywhere. `lib/plans/syncSubscription.ts` is the only place they are read.

### Who writes what

| Piece | Job |
| --- | --- |
| `lib/plans/stripePrices.ts` | `priceIdFor` / `planForPriceId` over the three `STRIPE_PRICE_*` vars, `PLAN_RANK` for upgrade-versus-downgrade, and `planStatusFor` |
| `lib/plans/planRow.ts` | The **uncached** `user_plans` read, including the two Stripe ids, and the `stripe_subscription_id` → Clerk id reverse lookup |
| `lib/plans/syncSubscription.ts` | The only writer of `user_plans`: upsert, then `reconcilePlanChange` **only** if the tier changed or the status crossed the granting line |
| `lib/plans/billingIntent.ts` | The only writer of `billing_intents`: the atomic claim that allows one billing operation per account, and the `intent_id` every Stripe mutation is keyed on |
| `lib/plans/billingCustomer.ts` | The only writer of `billing_customers`: one Stripe customer per Clerk id, created before Checkout runs |
| `app/api/billing/` | `checkout`, `switch`, `pending`, `webhook`, with plan validation in `_shared.ts` |

**`readPlanRow` exists because `getUserPlan` is React-`cache()`d and that cache is live inside a route handler.** The webhook has to compare against the row as it was before its own write, and `reconcilePlanChange` calls `getUserPlan` itself — so a `getUserPlan` earlier in the same request would hand reconcile the stale pre-write row and reconcile to the tier the user just left. Never read the plan through the cached helper on a path that also writes it.

**`planStatusFor` fails closed.** `incomplete` and `paused` map to `unpaid`, and an unrecognised status does too. `canceled` and `incomplete_expired` map to `cancelled`. Only `active`, `trialing`, `past_due` and `unpaid` pass through as themselves, which keeps the dunning window described above intact.

**An unknown price id is reported and dropped, not guessed.** `planForPriceId` returning null means the deploy is pointed at prices from the wrong Stripe mode; writing a tier on a guess would grant the wrong entitlements to a paying user, so `syncSubscription` logs `billing:sync` and leaves the row alone.

**A failed upsert throws; the two guards above return null.** The distinction is whether retrying could help. A Supabase error is transient, so `syncSubscription` logs `billing:sync` and then throws, which turns into a 500 and puts the event back on Stripe's retry schedule — returning null there would leave a charged customer with no plan row and no redelivery, since Stripe counts a 200 as done. An unknown price id or an item-less subscription is a configuration fault that every retry would hit identically, so those log and return null and the route answers 200.

**A stale subscription's event is ignored.** `syncSubscription` drops any event whose subscription is not the one the row already points at, when the row's existing status grants. Every subscription we create carries `subscription_data.metadata.clerk_user_id`, so an event for a **previous** subscription resolves to the same Clerk id and would otherwise rewrite the row with that subscription's tier, status and period. A cancelled-then-resubscribed account replaying the old `customer.subscription.deleted` is the reachable case: the row flips to `cancelled`, `changed` flips with it, and reconcile deactivates every link and clamps retention on a paying customer. The row is the record of which subscription is live; an event for any other one has nothing to say about it.

### Events

The webhook handles nine and returns 200 to everything else, so Stripe stops retrying what it was never going to act on. Thrown errors return 500 **so that** Stripe does retry.

| Event | What it covers |
| --- | --- |
| `checkout.session.completed` | The first purchase. Clerk id from `client_reference_id`, regex-validated the same way `admin/reconcile-plan` validates its input. Also clears the `billing_intents` row |
| `checkout.session.expired` | An abandoned attempt. Clears the `billing_intents` row — this is the event the intent table leans on |
| `checkout.session.async_payment_failed` | A delayed payment method that failed after the session completed. Clears the row so the buyer can start again |
| `customer.subscription.updated` | Renewals, the scheduled downgrade taking effect, and every dunning transition into `past_due` / `unpaid` |
| `customer.subscription.deleted` | Cancellation. Writes `cancelled`, which drops entitlements and makes reconcile deactivate every link and clamp retention to the floor |
| `invoice.payment_failed` | Re-syncs from the invoice's subscription. Redundant with `customer.subscription.updated` on purpose; the upsert is idempotent so a double delivery costs nothing |
| `charge.refunded` | Cancels the subscription on a full refund of the latest invoice. See below |
| `charge.dispute.created` | Cancels the subscription on a chargeback. See below |
| `customer.deleted` | Clears the `billing_customers` row. Reachable through a Managed Payments data-deletion request, which deletes Customer objects out of our own account |

**The three `checkout.session.*` handlers delete by `stripe_session_id`, never by `user_id`.** A late `expired` event for a session that has already been superseded would otherwise delete the row belonging to the session that replaced it, freeing a second payable checkout.

The Clerk id resolves in three steps: `client_reference_id`, then `subscription.metadata.clerk_user_id`, then a `user_plans` lookup on `stripe_subscription_id`. The first two can be absent on a subscription created outside our own checkout; the third is why `stripe_subscription_id` carries a unique index.

**Idempotency needs no table.** Every handler ends in the same upsert keyed on `user_id`, so a replayed or duplicated event writes identical values and the `changed` comparison then skips the reconcile. Last delivery wins if Stripe ever delivers out of order **for the subscription the row points at**; events for any other subscription are dropped by the staleness check above, which is what keeps "last wins" from meaning "oldest abandoned attempt wins".

**`invoice.subscription` no longer exists.** It is `invoice.parent.subscription_details.subscription` on current API versions.

### Buying and switching

**No plan → `POST /api/billing/checkout`.** It 409s `{ reason: "has-plan" }` when a granting subscription already exists, which is the guard against a second subscription being bought alongside the first.

**The `has-plan` guard cannot stop a double charge on its own**, because it runs when the session is *created* and the charge happens when the session is *completed*. It reads `user_plans`, which only the webhook writes, so every attempt made before the first subscription exists sees an empty row and passes. Three retries against a checkout stalling on 3-D Secure therefore produced three sessions, three subscriptions and three customers — the rate limiter's 5-per-10-minutes was the only thing bounding it.

**That incident no longer reproduces the same way.** Under Managed Payments a stalled 3-D Secure attempt creates **no subscription at all** — see the stalled-attempt note below — so "three subscriptions" is not reachable from repeated authentication failures. What survives is the weaker version: repeated attempts can still produce several sessions and several customers. That is what the intent row closes.

#### One billing operation per account, claimed in Postgres

**`billing_intents` has `user_id` as its primary key, and that *is* the invariant.** A route claims the row with `insert … on conflict (user_id) do nothing` **before** it calls Stripe. Postgres makes exactly one concurrent caller win; the loser never touches Stripe at all. `lib/plans/billingIntent.ts` is the whole of it — `claimIntent` returns a discriminated union saying either "you own this row" or "someone else holds a live one, here it is".

This replaces a Redis key at `chalkie:checkout:<userId>` whose own documentation conceded it was "the optimisation, not the guarantee". A cache is built to lose data, so an evicted key silently fell through to an idempotency key that included the plan — and browsing Basic to Plus and back inside one hour therefore produced a second payable session. **Redis is now rate limiting and the PDF lease only. Nothing about a payment is stored in a cache.**

Three rules govern the row:

- **`expires_at` means the row is dead after this instant**, and it is the only liveness field. While `creating` it is 60 seconds out, which doubles as the crash-reclaim window: a request that dies between claiming and creating leaves a row that the next request reclaims rather than one that wedges the account forever. Once `open` it is the session's own `expires_at` plus five minutes, so the row always outlives the session it tracks.

    **The read path treats any lapsed row as absent and reclaims it inline.** That is what makes the webhook a cleanup optimisation rather than a dependency — an endpoint that is down for a week cannot stop anyone buying.
- **`intent_id` is the Stripe idempotency key**, minted fresh on every claim and every reclaim. It protects the retry that actually happens: the SDK re-sending a request whose connection dropped after Stripe had already created the session.

    **A reclaim deliberately does *not* reuse the previous `intent_id`.** Replaying a key requires byte-identical parameters, and `expires_at` cannot be byte-identical across a reclaim — Stripe demands it be at least 30 minutes in the future *at creation time*, so a stored timestamp replayed 60 seconds later is rejected as too soon, and a recomputed one is rejected as a parameter change. The orphaned session this leaves behind is inert: its URL was never returned to anyone, and it expires in 30 minutes.
- **No `checkout_url` column.** The reuse path retrieves the session from Stripe, so Stripe stays the authority on live state and a session paid before its webhook landed produces a correct 409 `{ reason: "checkout-pending" }` instead of a dead link.

**Why this beats the hour-bucketed key it replaces.** A bucketed key false-replays a legitimate repeat: Basic → Plus → Basic inside one hour collides with its own first key, and Stripe answers the third click with the first click's session. It also does not survive a crash. A stored UUID does both correctly, and it costs one column.

**Switch shares the table.** A `kind = 'switch'` claim covers `POST /api/billing/switch` and `DELETE /api/billing/pending`, so a checkout cannot race a plan change either. The claim is released in a `finally`, and every Stripe mutation on those paths is keyed off `intent_id` with a step suffix — `:release`, `:update`, `:schedule-create`, `:schedule-update`. That is MON-14 with RACE-3 and RACE-4: before this, `subscriptions.update` carried no key at all and two upgrade clicks landing together put two prorations on the next invoice.

#### One Stripe customer per account

**`billing_customers` maps a Clerk id to exactly one Stripe customer, and the customer is created before Checkout ever runs.** `customerFor` in `lib/plans/billingCustomer.ts` reads the row, adopts `user_plans.stripe_customer_id` if one is already there, and otherwise calls `stripe.customers.create` with `metadata.clerk_user_id` and `idempotencyKey: customer:<userId>`, then inserts `on conflict do nothing` and returns the *stored* id. Two layers of dedupe: the key handles a same-instant race, the unique constraint handles everything slower. A losing racer's customer is orphaned, never referenced and never charged.

This is FLOW-6. Previously nothing called `customers.create`; Checkout minted one the moment a card was submitted, no webhook fires for an unpaid attempt, so nothing wrote the id back and the next attempt minted another. Repeated abandonment scattered one person across several customers.

- **Keyed on the Clerk id, not the email.** Email is mutable in Clerk. Keying on it would orphan the customer the moment someone changes their address and mint a duplicate on their next purchase — which is the exact failure being removed.
- **The customer is created with metadata only, no email.** Checkout collects the address and attaches it. Passing an email would make the parameter set depend on a Clerk lookup that can fail, and a key replayed with a different parameter set is a hard error. This is also what deletes the old `identity` component of the checkout key, whose `"anon"` fallback silently disabled the whole idempotency layer whenever the Clerk profile lookup came back empty.
- **A separate table, not a column on `user_plans`.** `plan` and `status` are `not null` so a customer-id-only row cannot be written there, and more importantly a **null `stripe_customer_id` on a granting row is the comped marker**. Writing a customer id into `user_plans` before purchase would silently un-comp hand-granted accounts. Nothing outside `syncSubscription` may write that column.
- **A stored customer id can go dead.** A Managed Payments data-deletion request cancels the customer's subscriptions and deletes the Customer, Subscription, Invoice and Charge objects **from our own account**. Session creation therefore catches `resource_missing` and calls `replaceCustomer`, which forgets the row and mints a fresh customer with **no** idempotency key — reusing `customer:<userId>` inside its 24-hour window would replay the response containing the deleted id and loop forever. `customer.deleted` clears the row eagerly as well.

**Checkout sessions live 30 minutes**, Stripe's minimum, against the 1–2 hours the bucketed key forced. See the SEC-6 note below.

- **A stalled attempt leaves no subscription.** Managed Payments authenticates the card *before* creating the subscription, so abandoning at the 3-D Secure prompt produces `customer.created`, `payment_intent.created` and `payment_intent.requires_action` — and nothing else. No subscription, no invoice. A `requires_action` PaymentIntent has captured nothing, so the residue is inert and needs no cleanup.

    **This is the opposite of standard Checkout + Billing**, where the subscription is created first and sits `incomplete` for 23 hours before expiring with its invoice voided. Stripe's own Billing docs describe that flow, and they also say expiring the session is how you cancel the subscription and void the invoice — all of which is true, and none of which applies here. Verified in test mode with `4000 0025 0000 3155`; re-verify if Managed Payments is ever turned off.

**Has a plan → `POST /api/billing/switch`**, never a second Checkout Session. Managed Payments does not allow creating a subscription outside Checkout, but updating one is fine.

- **Upgrade is immediate**, with `proration_behavior: "create_prorations"` and **no `billing_cycle_anchor`**. `always_invoice` would raise a one-off invoice outside the billing period, which Managed Payments does not support; `create_prorations` puts the difference on the next invoice instead. Omitting the anchor is what preserves the period, and therefore the quota — see the note above.
- **Downgrade is scheduled to `current_period_end`** through a subscription schedule: the current phase keeps the current price to the period end, the next phase carries the new one, and `end_behavior: "release"` hands the subscription back afterwards. Nothing changes in `user_plans` at the moment of the click — the phase flip fires `customer.subscription.updated` and the webhook reconciles then, at exactly the right instant, with no cron and no pending-plan column.

    **The update resends every phase that has already started, not just the current one.** Stripe refuses to remove a phase once it has begun, and a schedule outlives its first flip — `end_behavior: release` fires when the *schedule* ends, so for the month after a downgrade lands the subscription is still schedule-managed with a completed phase behind it. Rebuilding the array as `[current, new]` drops that completed phase and the second downgrade of that window is rejected outright.
- **An upgrade releases any existing schedule first.** That both unblocks `subscriptions.update`, which refuses to touch a schedule-managed subscription, and cancels a pending downgrade, which is what someone upgrading obviously means.

### Refunds do not cancel subscriptions — so we do

**Under Managed Payments a refund and a cancellation are unrelated events.** Refunds go through Onelink support; cancellation is the customer's own action in Onelink or our API call. Nothing ties them. Without a handler a customer asks Onelink for their month back, keeps their tier, and is billed again next month — repeatably.

**We are not always the one refunding.** Stripe's docs are explicit: "If you don't respond within 48 hours, Stripe might issue a refund without your approval." The Managed Payments dashboard also carries a setting — *Email me for approval* versus *Refund without emailing me* — and on the second there is no email at all. Any automatic rule here will occasionally fire on a refund we did not initiate. Check which setting the account is on before changing the policy.

`charge.refunded` therefore:

1. **Stops on a partial refund**, logging `billing:refund`. A part refund is a goodwill credit or a tax correction, not an exit. It matters under Managed Payments because a refund returns the customer's sales tax while we may still owe it — our balance drops by more than the refund, so a refunded month is worse than a month that never happened.
2. **Stops on a full refund of a superseded invoice**, logging the same. Refunding month 3 of an active month-9 subscription is a correction; severing that tutor would run `reconcilePlanChange` against them mid-term, deactivating links and clamping retention.
3. **Otherwise cancels the subscription**, which fires `customer.subscription.deleted` and lands in the handler that already writes `cancelled` and reconciles. **One revoke path, not two** — nothing here writes `user_plans` directly.

**The already-cancelled guard is not optional.** A redelivered `charge.refunded` would otherwise throw on every retry Stripe makes, forever. `revoke` returns early on a `canceled` subscription and, if the cancel call races another delivery, re-reads and treats an already-cancelled subscription as success.

**`charge.invoice` no longer exists.** On current API versions the Charge carries `payment_intent` and nothing else that points at billing, so the route is `charge.payment_intent` → `stripe.invoicePayments.list({ payment: { type: "payment_intent", payment_intent } })` → the invoice → `invoice.parent.subscription_details.subscription`. This is the same class of removal as `invoice.subscription` above, and it fails at compile time rather than silently.

### Chargebacks

**Stripe owns the dispute; it does not appear to own the subscription.** Managed Payments handles disputes end to end — automated and manual review, evidence submitted on our behalf, and it may accept a dispute it judges unwinnable rather than contest it. Nothing in the documentation says the subscription is touched, and in standard Stripe the two systems are independent. `charge.dispute.created` therefore resolves the charge to its subscription by the same path as a refund and cancels.

The rationale is that "subscription canceled" is one of Stripe's own dispute categories, so a chargeback here is overwhelmingly someone exiting badly, and continuing to bill them generates further disputes and further dispute-received fees.

**The cost of being wrong is real and one-way.** Cancelling is irreversible, so a dispute we later win leaves a legitimate customer with no subscription and no route back except buying again.

> **Outstanding verification.** Trigger a test-mode dispute with card `4000 0000 0000 0259` and record here what Managed Payments actually does to the subscription. If it already cancels, this handler is redundant with `customer.subscription.deleted` and should be removed rather than left to double-cancel.

### SEC-6: a shared checkout URL gifts a subscription

`subscription_data.metadata.clerk_user_id` and `client_reference_id` are fixed when the session is created, so whoever pays a shared URL, the plan lands on the account that created it. The payer loses money; the account owner gains a plan.

**This cannot be closed with hosted Checkout, and hosted Checkout is the only option.** Managed Payments supports Checkout and Payment Links only — Elements and "embeddable web components" are explicitly unsupported, and custom domains are not supported either. Embedded Checkout, which would render the session inside our own authenticated page and leave no URL to copy, is therefore unavailable. Once the browser has redirected, `checkout.stripe.com/...` is in the address bar and copyable, and no endpoint of ours sits in front of that.

What narrows it: **session life is 30 minutes**, Stripe's minimum, down from the 1–2 hours the hour-bucketed idempotency key forced. Dropping that key is what made the shorter window possible — `expires_at` no longer has to be bucket-aligned to keep parameter sets byte-identical.

Pre-creating the customer also cleans up the aftermath rather than the cause: the subscription, the receipts and Onelink access all land on the owner's customer record instead of a stranger's email address.

### Comped plans: a null `stripe_customer_id` is permanent access

**A granting row with no `stripe_customer_id` is a plan granted by hand, and the billing routes refuse to touch it.** `compedPlanDenial` in `app/api/billing/_shared.ts` is the single definition, called first by both `checkout` and `switch`, returning 409 `{ reason: "comped-plan" }`.

This is a feature, not a migration artefact. It is how an account gets indefinite access to a tier without a card — the author's own accounts, friends, and free plans handed out as incentives later. The row is the grant; there is no subscription to renew, so it never lapses.

**`stripe_customer_id` is the marker, not `stripe_subscription_id`.** A customer id survives cancellation, so a real subscriber who cancels keeps theirs and can check out again — their row is not comped, it is lapsed. A subscription id would wrongly read that same lapsed subscriber as comped and lock them out of resubscribing, which is precisely the wrong person to block.

**Refusing checkout matters more than refusing switch.** Without it, a comped account could pay for a tier it already has for free, and the webhook would overwrite the grant with a real subscription that lapses. The grant would be silently converted into something that can expire.

The three button states on `/pricing` are unchanged for these accounts — they read **Choose**, and clicking returns the denial toast. That is deliberate; see the note above.

### The pending change is mirrored into Supabase

The schedule in Stripe remains the authority — it is what actually fires — but `pending_plan` / `pending_plan_at` mirror it locally so the app can say so without an API call on every render. Without the mirror, a scheduled downgrade is invisible: the row still reads the old tier, correctly, and nothing anywhere hints that it is about to change.

**`syncSubscription` stays the only writer**, taking an optional third argument:

| Argument | Meaning |
| --- | --- |
| a `PendingPlanChange` | Set it — the downgrade branch of `switch` passes the tier and the effective date |
| `null` | Clear it — the upgrade branch and `DELETE /api/billing/pending`, both of which have just released the schedule |
| omitted | Decide automatically, which is what every webhook does |

The automatic rule clears the pending columns when **the subscription no longer has a schedule** (released or cancelled) or when **the tier now equals `pending_plan`** (the change landed). Otherwise it omits both columns from the upsert entirely, so a renewal mid-wait leaves them untouched.

**Omitting rather than rewriting is what makes the ordering safe.** Creating a schedule can itself emit `customer.subscription.updated`, which races the route's own write. If the webhook lands first it finds no pending value and writes none, and the route's write follows; if it lands second it sees a schedule and a tier that does not match, and leaves the columns alone. Both orderings converge. Rewriting the columns on every sync would let the webhook erase a pending change that had just been scheduled.

**`DELETE /api/billing/pending`** releases the schedule and clears the mirror, which is the only way back from a scheduled downgrade — before it existed the sole escape was to click Upgrade, which released the schedule as a side effect nobody would guess. It 409s `no-pending-change` when there is nothing scheduled, and it releases by id read from the subscription rather than from the row, so a schedule cancelled in the Stripe dashboard still clears locally.

**The banner lives on `/pricing` for now**, above the tiers, and is rendered straight off `readPlanRow` — the page already loads that row for the highlight, so it costs no extra query. It belongs in Settings' current-plan section once that page exists; see `TODO.md`.

### The pricing page

`/pricing` lives in the `(home)` group, so it is public and carries the marketing chrome. It reads `auth()` — nullable, since signed-out visitors are the point — and then resolves everything it needs from a single `readPlanRow` when signed in: the granting tier for the highlight, whether any row exists, and whether a Stripe subscription exists. One uncached query, not three cached ones.

- **Comparison numbers are derived from `entitlementsFor`, server-side**, in `lib/plans/planComparison.ts`. The table can therefore never drift from `lib/plans/entitlements.ts`, which is the one thing a hand-written pricing table always gets wrong eventually.
- **The comparison table knows nothing about the current plan**, deliberately — it takes `rows` and nothing else. The tier card above it already carries the surface change and the **Current plan** badge; repeating that as a coloured column made the table read as a recommendation rather than a reference, and put two competing highlights on one screen. If the current tier ever needs marking here, it should echo the card's treatment rather than invent a second one.
- **Prose and prices live in `lib/plans/pricingCopy.ts`**, which is deliberately *not* `server-only` — the same reasoning as `lib/plans/labels.ts`. It holds display strings and no entitlement values, and its copy is the verbatim Stripe text at the bottom of this file.
- **`PlanActionButton` picks the endpoint off `stripe_subscription_id`, not off whether a plan grants.** `switch` → only with a real Stripe subscription; `checkout` → everything else; the current tier → disabled, but again only with a subscription behind it; signed out → the sign-in page with a redirect back. Every one of those is re-derived server-side, so a client that chooses wrong gets a 409 rather than a double charge.

    **Keying this on `currentPlan !== null` is the bug to avoid**, and it is not hypothetical — it was the first thing to break in testing. A hand-seeded row (the `insert into user_plans` at the bottom of this file) grants a tier with both Stripe ids null, so the client called `switch`, which requires a subscription id, and every seeded account got `no-subscription` with no way forward. Seeded accounts are the *normal* state of every account that predates Stripe, including your own. The page therefore resolves all three facts from one `readPlanRow`: the granting tier, whether any row exists, and whether a subscription exists.

    A row with no Stripe behind it consequently shows **Choose** on all three tiers, including the one it is on. Both routes then refuse — see comped plans below. The buttons are deliberately left saying the wrong thing: the accounts this affects are hand-granted ones belonging to people who already know it, and a fourth button state for them would be carrying UI weight for an audience of a handful.
- **Both switches go through a confirmation dialog**, and each carries a billing note in an inset `bg-background-second` panel below the description. The downgrade names what it costs, because it is the action that takes something away, and its note says nothing is charged or refunded today and the next invoice is the first at the lower price. The upgrade's note says the user is not charged today, that the unused part of the period is credited and recharged at the new price, and that the difference joins the next invoice.

    **The upgrade dialog is not decoration.** It was deliberately absent at first — an upgrade takes nothing away, so there was nothing to warn about — but `create_prorations` means the money moves on an invoice days or weeks after the click, which is exactly the kind of thing a user should see before committing rather than on their statement. Only the downgrade's confirm button is `destructive`; the upgrade's is `default`. **Choose** still has no dialog, because Checkout states the price itself on the next screen.
- **With no plan, all three buttons rest on `outline` and lift to the `default` fill on card hover**, driven by `group/plan` on the card and `group-hover/plan:` on the button. Three solid white buttons side by side made every tier look equally urged; resting them grey and brightening only the card under the cursor turns the row into a choice. The class list ends with `hover:bg-primary/90`, which is not redundant — `cn()` uses it to displace the `outline` variant's own `hover:bg-foreground-third/35`, so hovering the button cannot fight the card rule. Buttons for a user who already has a plan are left alone: their card is already marked, and lifting a downgrade button on hover would advertise it.

    **The lift keys on `currentPlan`, not on `hasSubscription`.** It was keyed on `switching` at first, which handed a hand-granted row — a granting tier with both Stripe ids null — the entire no-plan treatment: three cards lifting under the cursor, urging a purchase at someone who already has the tier and whose card right above the button carries the **Current plan** badge. Which endpoint the button calls is a Stripe question; whether the row reads as a sell is a plan question, and comped accounts are exactly where the two part company. `PricingTiers` already keyed its `ACTIVE_SURFACE` and badge off `currentPlan === plan`, so the button was the only piece disagreeing with the card around it.
- **Basic carries a "Free trial available" badge** that nothing implements yet. It is copy sitting ready for the trial work in `TODO.md`, not a live offer — `trialing` is a status the table already grants, but nothing sets it.
- **The badge hides for anyone who has ever had a plan**, gated on the `readPlanRow` result being non-null rather than on whether that row grants. The two differ exactly where it matters: a cancelled or `unpaid` row grants nothing, so a granting check reads it as a fresh visitor and would offer a returning tutor a trial they have already used. Row existence is the right signal because rows are never deleted — a cancellation rewrites `status`, and reconcile is careful never to remove the row. It also covers a hand-seeded account, which has a plan but no Stripe ids.

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
    pending_plan           text check (pending_plan is null or pending_plan in ('basic', 'plus', 'professional')),
    pending_plan_at        timestamptz,
    updated_at             timestamptz not null default now()
);

create table billing_customers (
    user_id            text primary key,
    stripe_customer_id text not null unique,
    created_at         timestamptz not null default now()
);

create table billing_intents (
    user_id           text primary key,
    kind              text not null check (kind in ('checkout', 'switch')),
    plan              text not null check (plan in ('basic', 'plus', 'professional')),
    intent_id         uuid not null,
    status            text not null check (status in ('creating', 'open')),
    stripe_session_id text unique,
    expires_at        timestamptz not null,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
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

### Migration for Stripe

```sql
alter table user_plans add column if not exists stripe_customer_id text;
alter table user_plans add column if not exists stripe_subscription_id text;

create unique index if not exists user_plans_stripe_subscription_idx
    on user_plans (stripe_subscription_id);
create index if not exists user_plans_stripe_customer_idx
    on user_plans (stripe_customer_id);
```

Both columns were documented above long before anything wrote them, so run this even if the schema block looks like it already covers them — there are no migration files, so the table is whatever was typed into the dashboard.

**The unique index is load-bearing.** It is the third and last step of the webhook's Clerk-id resolution, and a duplicate would make that lookup ambiguous exactly when the first two steps have already failed.

### Migration for pending plan changes

```sql
alter table user_plans add column if not exists pending_plan text
    check (pending_plan is null or pending_plan in ('basic', 'plus', 'professional'));
alter table user_plans add column if not exists pending_plan_at timestamptz;
```

No backfill. A null `pending_plan` means nothing is scheduled, which is true of every existing row.

### Migration for the billing intent and customer tables

```sql
create table if not exists billing_customers (
    user_id            text primary key,
    stripe_customer_id text not null unique,
    created_at         timestamptz not null default now()
);

create table if not exists billing_intents (
    user_id           text primary key,
    kind              text not null check (kind in ('checkout', 'switch')),
    plan              text not null check (plan in ('basic', 'plus', 'professional')),
    intent_id         uuid not null,
    status            text not null check (status in ('creating', 'open')),
    stripe_session_id text unique,
    expires_at        timestamptz not null,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);
```

**No backfill, and none is possible.** `billing_intents` holds only in-flight operations, so an empty table is the correct starting state. `billing_customers` fills itself: `customerFor` adopts `user_plans.stripe_customer_id` when it finds no row of its own, so every existing subscriber is absorbed on their next billing action rather than by a script.

**That adoption step is what stops the scatter coming back.** Without it a subscriber who cancels and later resubscribes would have a `user_plans` row pointing at one customer and no `billing_customers` row at all, and the next checkout would mint a second customer for them — the precise failure this table exists to prevent.

**`stripe_session_id` is unique but nullable**, which Postgres allows for any number of rows. It is null for the whole `creating` window and whenever a row is reclaimed, and the unique constraint is what lets the webhook delete by session id without ever touching the wrong account's row.

## Seeding your own account

```sql
insert into user_plans (user_id, plan, status)
values ('user_xxx', 'professional', 'active')
on conflict (user_id) do update
    set plan = excluded.plan, status = excluded.status, updated_at = now();
```

Leaving `stripe_customer_id` null is what makes this a **comped plan**: indefinite access that never renews and that the billing routes refuse to change. That is the intended way to grant an account a tier — your own, a friend's, or a free plan given as an incentive. See the comped plans section above.

It also means the reverse is true: never null out `stripe_customer_id` on a real subscriber to "reset" them, because it converts a billed account into a permanent free one while the Stripe subscription keeps charging.

## Deploying

Both sides ship together — the ticket carries `cap`, and the Worker rejects a ticket without one. Deploy Vercel and `wrangler deploy` in the same window, and remember `npm run build` does not typecheck the Worker (`cd realtime && npm run typecheck`).

Testing the DO backstop needs separate Clerk accounts, not tabs, and a simulated downgrade — create the room under Professional, then `update user_plans set plan = 'basic'` and reconnect. Normal use cannot reach that path, because the write-time cap stops the oversized room existing in the first place.

### Running reconcile by hand

Stripe writes `user_plans` now, so this is the override rather than the mechanism: a hand-edited `update user_plans set plan = ...` followed by a reconcile, for seeding an account or unpicking a bad row. `POST /api/admin/reconcile-plan` takes `{ "userId": "user_xxx" }` and is guarded by `requireAdmin` — an exact role match, so a tutor account cannot call it. It is deliberately not rate limited.

A hand-edit goes out of step with Stripe the moment the next webhook lands, since `syncSubscription` writes whatever the subscription says. Change the subscription in Stripe if you want the change to stick.

Clerk authenticates it by session cookie, so the least friction is `fetch("/api/admin/reconcile-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "user_xxx" }) })` from the browser console while signed in as admin. From a terminal, curl it with the `__session` cookie copied out of devtools. It returns a summary — rooms rewindowed, links deactivated and reactivated, and the ids of any rooms left over the member cap.

## Plan text within Stripe

This is exactly the description and marketing text stored within Stripe. Reuse it wherever plan descriptions are needed on the site.

### Basic — £5 per month

For tutors teaching one-to-one, a couple of lessons a week. You get 10 lessons a month, workspaces stay available for 14 days, and you can keep 3 students linked on your account.

- One-to-one lessons.
- 10 lessons per month — around two a week.
- Workspaces stay available for 14 days after your lesson.
- Open your workspace 1 hour before you start.
- Keep up to 3 students on your account.

### Plus — £15 per month

For tutors with a busy timetable or entering an exam period. You get 50 lessons a month, workspaces stay available for 30 days, and you can keep 25 students linked on your account.

- Up to 3 students in a lesson.
- 50 lessons per month — around ten a week.
- Workspaces stay available for 30 days after your lesson.
- Open your workspace 24 hours before you start.
- Keep up to 25 students on your account.

### Professional — £45 per month

For full-time tutors teaching several lessons a day. You get unlimited lessons each month, workspaces stay available for 90 days, and you can link as many students as you need.

- Up to 5 students in a lesson.
- Unlimited lessons.
- Workspaces stay available for 90 days after your lesson.
- Open your workspace 3 days before you start.
- Keep unlimited students on your account.
