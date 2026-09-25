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
- **The quota period is the billing period, not the calendar month.** `usagePeriod` reads `current_period_start` / `current_period_end` off the plan row and falls back to the calendar month when they are absent, inconsistent, **or already in the past**. Anchoring on the month handed a tutor who subscribed on the 25th the tail of one month plus the whole of the next inside a single billing cycle — up to twice the allowance, every first month. `usage_counters.period_start` is still a `date`, so the anchor is the UTC date of `current_period_start` and a new period is still a new row with no reset job. Read `current_period_start` from Stripe rather than recomputing a day-of-month: an anchor on the 31st bills on the 28th in February and a recomputed date drifts away from the invoice.

    **A period that has already ended is a missed renewal, not a period.** Only the webhook advances those two columns, so a `customer.subscription.updated` that never arrives froze the anchor permanently: `period_start` never moved, the counter row never rolled, and a Basic tutor sat at 10/10 for ever with no reset job to save them. `usagePeriod` therefore treats a lapsed `current_period_end` as absent, falls back to the calendar month so the allowance keeps rolling, and reports `usage:stale-period` — a stale period is always a symptom of a dropped event, so it must be loud rather than silently generous.

    **That report is throttled per user, once per ten minutes per instance.** `usagePeriod` runs on every dashboard render and every workspace create, so one subscriber whose renewal event was dropped otherwise writes an `error_logs` row on every page view until someone notices — the condition is permanent, not transient, which is what makes an unthrottled report here an amplifier rather than a signal. The throttle is keyed by user and not global, because a global one would let the first stale account mask every other. `usagePeriod` takes `userId` purely for this: it is what the map is keyed on, and it is also what stamps `user_id` on the report, which previously landed unattributed and so named no account to go and look at. The map is cleared wholesale when it passes 500 entries; like the `billing:webhook-signature` throttle it only has to bound the flood, not be exact.

- **`billing_cycle_anchor: 'now'` is exactly right on an immediate upgrade, and wrong everywhere else.** An immediate upgrade is a fresh month bought at full price (see Buying and switching below), so resetting the anchor is what makes the new allowance the thing the user just paid for. Every other path — downgrades, scheduled upgrades, renewals — must leave the anchor alone, because there the user has not bought a new month and a reset would mint a free allowance. This inverts the older rule here, which was written when upgrades were prorated: paying only the difference must never buy a whole new quota.

## Plan changes

A plan change is a **hard cut**: the new tier's limits apply to everything the user already has, not just to what they create next. Three of the five entitlements used to be baked into a row at write time and never revisited — `retentionMs` and `leadMs` as `expires_at` / `opens_at` on the `Room`, and `maxLinkedStudents` as a count checked once at redeem — so a downgrade left the old tier's terms in place indefinitely and an upgrade never reached rows already written.

`reconcilePlanChange(userId)` in `lib/plans/reconcile.ts` is the single entry point that closes that gap. The Stripe webhook reaches it through `syncSubscription`, and `POST /api/admin/reconcile-plan` still calls it by hand; nothing else should replicate its arithmetic.

**Room writes go out in batches of 20, and reconcile reports whether it finished.** It ran one sequential `update` per room, and a Professional tutor on 90-day retention with unlimited lessons holds hundreds — at a round-trip each that is most of a Vercel function's budget on a single cancellation. Every room has a different `start_time`, so grouping by value collapses nothing; the fix is concurrency, not a single statement. Twenty at a time turns three hundred round-trips into fifteen.

**The timeout was the smaller half of that bug.** The row is upserted before reconcile runs, so a redelivery after a timeout found `previous.plan === plan`, computed `changed` as false, and **skipped reconcile entirely** — leaving a half-applied downgrade permanent, with some rooms rewindowed and every link untouched. `user_plans.reconcile_pending` is the latch: the upsert sets it whenever `changed`, `syncSubscription` runs reconcile when either `changed` or the latch is already set, and only a reconcile that reports `ok` clears it. Anything less throws, which 500s the webhook and puts the event back on Stripe's retry schedule with the latch still raised. `clearReconcilePending` deliberately does not touch `updated_at`, so clearing the latch cannot make the ordering guard above discard the next real event.

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
| `lib/plans/planRow.ts` | The **uncached** `user_plans` read, including the two Stripe ids, the two mirror columns and the reconcile latch; the `stripe_subscription_id` and `stripe_customer_id` → Clerk id reverse lookups; and `clearReconcilePending` |
| `lib/plans/syncSubscription.ts` | The only writer of `user_plans`: upsert, then `reconcilePlanChange` if the tier changed, the status crossed the granting line, or the latch is still raised from a reconcile that did not finish. Also holds `revokeDeletedCustomer`, the one write not driven by a subscription |
| `lib/plans/billingIntent.ts` | The only writer of `billing_intents`: the atomic claim that allows one billing operation per account, and the `intent_id` every Stripe mutation is keyed on |
| `lib/plans/billingCustomer.ts` | The only writer of `billing_customers`: one Stripe customer per Clerk id, created before Checkout runs |
| `app/api/billing/` | `checkout`, `switch`, `pending`, `webhook`. `_shared.ts` holds the body parsers, the comped and `past_due` denials, and `clearCancellation` |

**`readPlanRow` exists because `getUserPlan` is React-`cache()`d and that cache is live inside a route handler.** The webhook has to compare against the row as it was before its own write, and `reconcilePlanChange` calls `getUserPlan` itself — so a `getUserPlan` earlier in the same request would hand reconcile the stale pre-write row and reconcile to the tier the user just left. Never read the plan through the cached helper on a path that also writes it.

**`planStatusFor` fails closed.** `incomplete` and `paused` map to `unpaid`, and an unrecognised status does too. `canceled` and `incomplete_expired` map to `cancelled`. Only `active`, `trialing`, `past_due` and `unpaid` pass through as themselves, which keeps the dunning window described above intact.

**An unknown price id is reported and dropped, not guessed.** `planForPriceId` returning null means the deploy is pointed at prices from the wrong Stripe mode; writing a tier on a guess would grant the wrong entitlements to a paying user, so `syncSubscription` logs `billing:sync` and leaves the row alone.

**A failed upsert throws; the two guards above return null.** The distinction is whether retrying could help. A Supabase error is transient, so `syncSubscription` logs `billing:sync` and then throws, which turns into a 500 and puts the event back on Stripe's retry schedule — returning null there would leave a charged customer with no plan row and no redelivery, since Stripe counts a 200 as done. An unknown price id or an item-less subscription is a configuration fault that every retry would hit identically, so those log and return null and the route answers 200.

**A stale subscription's event is ignored.** `syncSubscription` drops any event whose subscription is not the one the row already points at, when the row's existing status grants. Every subscription we create carries `subscription_data.metadata.clerk_user_id`, so an event for a **previous** subscription resolves to the same Clerk id and would otherwise rewrite the row with that subscription's tier, status and period. A cancelled-then-resubscribed account replaying the old `customer.subscription.deleted` is the reachable case: the row flips to `cancelled`, `changed` flips with it, and reconcile deactivates every link and clamps retention on a paying customer. The row is the record of which subscription is live; an event for any other one has nothing to say about it.

**That drop is always reported, and the two reasons to drop are told apart.** This branch is the sink every duplicate-subscription path in the system drains into, and it used to `return null` in silence — so a customer billed on two subscriptions produced no row, no error and no signal of any kind. The incoming subscription's own status decides which it is: a `canceled` or `incomplete_expired` one is a dead subscription's trailing event and logs `billing:stale-subscription`, while one Stripe still considers live means two subscriptions are billing the same account concurrently and logs **`billing:duplicate-subscription`**. Treat the second as money being taken twice and go and look.

**An out-of-order event is dropped.** Stripe does not guarantee delivery order, and a redelivery after a failure can land arbitrarily late. `syncSubscription` takes the event's `created` timestamp and skips the write when it predates the row's `last_event_at`, so a replayed older update cannot overwrite a newer one. Without it, two `customer.subscription.updated` events from one upgrade arriving backwards settle the row on the tier the user just left — billed for Plus, entitled to Basic, with nothing to correct it until the next renewal up to a month away. The comparison is strictly less-than because `event.created` is second-granular; two events inside one second write the same state anyway. The route-driven calls in `switch` and `pending` pass no timestamp and are never skipped — they already hold the intent, so they are the authority at that moment.

**The watermark is `last_event_at`, not `updated_at`, and the two are different clocks.** `last_event_at` carries `event.created` and is written **only** when `syncSubscription` is called with one, so it means "the newest event this row has processed". `updated_at` means "the last time anything wrote this row", which includes the route-driven writes in `switch` and `pending` that have no event behind them at all. Comparing Stripe's clock against ours broke two things:

- **It swallowed the reconcile latch.** `switch` calls `subscriptions.update`, Stripe emits `customer.subscription.updated` with `created` a second or two *earlier*, and the route then upserts with `reconcile_pending` raised and `updated_at` set to now. If the route's own `reconcilePlanChange` fails — one `Room` write erroring is enough — it throws with the latch still up, and the delivery of that event is then dropped as out-of-order *before* it reaches the `changed || previous?.reconcilePending` branch that exists precisely to retry it. Nothing clears the latch until an event created after the route's write, which for an upgraded subscriber is the next renewal. The latch and the ordering guard were each correct alone and cancelled each other out.
- **It hid dunning on a failed immediate upgrade.** The invoice declines a moment after `subscriptions.update` returns, Stripe emits `invoice.payment_failed` and a `past_due` `customer.subscription.updated` both stamped before our write, and both were dropped — leaving the row reading `active` while Stripe read `past_due`, so `pastDueDenial` never fired and the user could keep switching tiers mid-dunning.

**`updated_at` still guards one thing: clearing the pending mirror.** An event that `last_event_at` lets through but that predates the row's last write is, by definition, older than a route write — and the only column a route writes that the webhook's automatic rule can erase is `pending_plan`. An event created before a schedule existed carries `subscription.schedule === null`, which is exactly the condition that clears the mirror, so letting it through would delete a downgrade warning that was scheduled moments earlier while the change itself still fires. `resolvePending` therefore omits both columns rather than clearing them when the event predates the row. Everything else converges on its own: whichever event carries the largest `created` wins, and older ones are dropped by the watermark.

### Events

The webhook handles nine and returns 200 to everything else, so Stripe stops retrying what it was never going to act on. Thrown errors return 500 **so that** Stripe does retry.

**A signature that does not verify is reported.** `billing:webhook-signature` covers both a missing `stripe-signature` header and a `constructEvent` failure, which is what a wrong or unset `STRIPE_WEBHOOK_SECRET` looks like from here. Without it the endpoint 400s every event in silence until Stripe disables it, and nothing anywhere says why. The route is public, so the report is throttled to **one per instance per ten minutes** — a misconfiguration produces a steady stream from Stripe's own IPs and is caught by the first one, while anyone spraying the endpoint cannot turn `error_logs` into a write amplifier. Deliberately not Redis-backed: a per-instance counter costs nothing and the throttle only has to bound the flood, not be exact.

**It carries no rate limit, deliberately.** It had one, keyed by IP — and because the signature check runs first, the only requests that could ever spend that budget were genuine, signed, already-paid-for events. It protected nothing and could only drop revenue, and a 429 went back to Stripe with nothing written to `error_logs`, so a throttled payment was invisible. Stripe also sends from a small IP pool, so the whole product's webhook traffic hashed onto a handful of identifiers and a batch of renewals at a period boundary was the realistic way to trip it. `maxDuration = 60` is set instead, which is the constraint that actually binds on this route.

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
| `customer.deleted` | Revokes the plan row, then clears the `billing_customers` row. Reachable through a Managed Payments data-deletion request, which deletes Customer objects out of our own account |

**The three `checkout.session.*` handlers delete by `stripe_session_id`, never by `user_id`.** A late `expired` event for a session that has already been superseded would otherwise delete the row belonging to the session that replaced it, freeing a second payable checkout.

**`checkout.session.completed` writes the plan row first and releases the intent second**, and the order is load-bearing. Released first, the account spends the whole of `subscriptions.retrieve` → `readPlanRow` → upsert → `reconcilePlanChange` with no intent row *and* no granting plan row — every guard open at once — and a second tab hitting `checkout` in that window walks straight through to a second payable session. Holding the intent across the sync costs nothing when it fails: the row's `expires_at` is the session's plus five minutes and the read path reclaims anything lapsed, so a throwing sync self-heals in at most thirty-five minutes instead of wedging.

**A stale Checkout Session is expired before its intent row is taken over, not after.** The old order took the row first and then expired the session, swallowing any failure — so a failed expiry left two live payable sessions with the replacement's URL already on its way back to the browser. `expireQuietly` now reports whether it worked, and a failure denies with `checkout-pending` and leaves the row pointing at the session that is still open, which sends the next attempt down the reuse path.

The Clerk id resolves in three steps: `client_reference_id`, then `subscription.metadata.clerk_user_id`, then a `user_plans` lookup on `stripe_subscription_id`. The first two can be absent on a subscription created outside our own checkout; the third is why `stripe_subscription_id` carries a unique index.

**Idempotency needs no table.** Every handler ends in the same upsert keyed on `user_id`, so a replayed or duplicated event writes identical values and the `changed` comparison then skips the reconcile. Last delivery wins if Stripe ever delivers out of order **for the subscription the row points at**; events for any other subscription are dropped by the staleness check above, which is what keeps "last wins" from meaning "oldest abandoned attempt wins".

**`invoice.subscription` no longer exists.** It is `invoice.parent.subscription_details.subscription` on current API versions.

**`customer.deleted` revokes the plan, because nothing else can.** A Managed Payments data-deletion request cancels the customer's subscriptions and then deletes the Customer, Subscription, Invoice and Charge objects out of our own account. If the cancellation lands first, `customer.subscription.deleted` writes `cancelled` and this handler finds nothing to do. If it does not — a dropped delivery, or a deletion that skips it — the row is left granting a tier whose subscription no longer exists, and **no future event can ever arrive to correct it**, because there is no object left to emit one. That is the only state in the billing system with no self-healing path, so the handler closes it directly: `revokeDeletedCustomer` resolves the row by `stripe_customer_id` and, if it still grants, writes `cancelled`, clears both mirrors, raises the latch and reconciles.

- **It runs before `forgetCustomerId`.** A failure then retries with the `billing_customers` row still in place, rather than with the lookup it depends on already torn down.
- **It never touches `stripe_customer_id` or `stripe_subscription_id`.** Nulling the customer id would convert the row into a **comped** one — permanent free access — which is the exact inversion warned about under Seeding your own account below.
- **A comped row can never match**, since its `stripe_customer_id` is null and the lookup is by that column. Hand-granted access is untouched by anyone else's deletion request.
- **It reports `billing:customer-deleted` only when it actually revokes.** If `customer.subscription.deleted` already did the work, the row no longer grants, the handler returns early and says nothing — so a row in `error_logs` always means the ordering assumption failed and the backstop earned its place.
- **It re-enters on the latch, exactly like `syncSubscription`.** A reconcile that fails throws with `reconcile_pending` raised, but by then the row reads `cancelled` — so a guard that only asked "does this still grant?" would skip the retry Stripe is making, and nothing would ever come back for it, since the subscription that would have emitted the next event no longer exists. The guard is therefore "grants **or** the latch is up", and the write and the report are skipped on the retry while the reconcile runs again.
- **`userIdForCustomer` throws on a Supabase error rather than returning null**, unlike `userIdForSubscription` beside it. A null there would silently skip the revoke, which is the whole failure being closed; throwing 500s the webhook and puts the event back on Stripe's retry schedule.

### Buying and switching

**No plan → `POST /api/billing/checkout`.** It 409s `{ reason: "has-plan" }` when a granting subscription already exists, which is the guard against a second subscription being bought alongside the first.

**A non-granting status does not mean there is no live subscription, and that gap was a double charge.** `planStatusFor` maps `incomplete` and `paused` to `unpaid`, which grants nothing — but an `incomplete` subscription is alive in Stripe for 23 hours and can still be paid. So: a delayed payment method fails, the row lands `unpaid`, `/pricing` sees no granting plan and therefore renders **Choose** rather than a switch, `has-plan` passes because the status does not grant, and a second subscription is bought. When the first invoice later clears, that subscription goes `active` and the webhook drops its event on the staleness check — leaving the customer billed twice with one of the two recorded nowhere. `cancelled` rows reach the same place whenever Stripe and the row have diverged.

#### Stripe is the authority, not the plan row

**Every local guard in this file reads `user_plans` or `billing_intents`, and both can be absent while a live subscription exists.** That was the whole residual double-charge surface. `user_plans` has no row at all after a paid checkout whenever the webhook dropped the event — an unknown price id, an unresolvable Clerk id, or a staleness drop all log and answer 200, so Stripe never retries and the row is never written — or whenever the endpoint was down longer than the intent row lives (30-minute session plus `ROW_GRACE_MS`, so 35 minutes). Past that point the intent is reclaimable, `readPlanRow` returns null, `has-plan` cannot fire, and a second subscription is bought.

**`checkout` therefore asks Stripe before it creates a session.** Once the intent is claimed, `subscriptionsOnCustomer` lists every subscription on the account's customer (`status: "all"`, one page of 100 — a long cancellation history must not push a live subscription off the page), and `withNamedSubscription` adds the one `user_plans` names if the list does not already carry it, so a customer id that has diverged from the row cannot hide a subscription. Then:

- **`active`, `trialing` or `past_due`** — the account genuinely has a subscription and the row was simply wrong. `syncSubscription` writes the row from it and checkout 409s `has-plan`. **This replaces cancelling it.** The old path cancelled and let the purchase proceed, which was right only while we could not tell a live subscription from a dead one; cancelling a subscription Stripe considers live forfeits the month the user already paid for, which is worse than refusing. A sync failure here is logged and swallowed — the denial is the load-bearing part and must not be masked by a 500.
- **More than one of those** — the account is already billed twice. `billing:duplicate-subscription` is logged before the denial.
- **`unpaid`, `incomplete` or `paused`** — stranded, and cancelled through `cancelStranded`, logging `billing:stranded-subscription`. The second attempt then proceeds, because a user who has reached this page has no working plan and wanting one is reasonable. A `resource_missing` means Stripe has already forgotten it and needs no action.
- **`canceled` or `incomplete_expired`** — ignored.

This runs **inside** the intent claim. It used to run before it, which meant an unkeyed `subscriptions.cancel` fired from a request that then lost the claim and returned "a payment is already going through" — having already cancelled the user's subscription.

**The `has-plan` guard on the row is now only a fast path.** It still runs first and still answers the common case from one Supabase read, but it is no longer what makes a double charge impossible. It reads `user_plans`, which only the webhook writes, so every attempt made before the first subscription exists sees an empty row and passes — three retries against a checkout stalling on 3-D Secure therefore produced three sessions, three subscriptions and three customers, with the rate limiter's 5-per-10-minutes the only thing bounding it.

**That incident no longer reproduces the same way.** Under Managed Payments a stalled 3-D Secure attempt creates **no subscription at all** — see the stalled-attempt note below — so "three subscriptions" is not reachable from repeated authentication failures. What survives is the weaker version: repeated attempts can still produce several sessions and several customers. That is what the intent row closes.

#### One billing operation per account, claimed in Postgres

**`billing_intents` has `user_id` as its primary key, and that *is* the invariant.** A route claims the row with `insert … on conflict (user_id) do nothing` **before** it calls Stripe. Postgres makes exactly one concurrent caller win; the loser never touches Stripe at all. `lib/plans/billingIntent.ts` is the whole of it — `claimIntent` returns a discriminated union saying either "you own this row" or "someone else holds a live one, here it is".

This replaces a Redis key at `chalkie:checkout:<userId>` whose own documentation conceded it was "the optimisation, not the guarantee". A cache is built to lose data, so an evicted key silently fell through to an idempotency key that included the plan — and browsing Basic to Plus and back inside one hour therefore produced a second payable session. **Redis is now rate limiting and the PDF lease only. Nothing about a payment is stored in a cache.**

Three rules govern the row:

- **`expires_at` means the row is dead after this instant**, and it is the only liveness field. While `creating` it doubles as the crash-reclaim window: a request that dies between claiming and creating leaves a row that the next request reclaims rather than one that wedges the account forever. Once `open` it is the session's own `expires_at` plus five minutes, so the row always outlives the session it tracks.

    **The `creating` window is per kind: 60 seconds for `checkout`, 120 for `switch`.** One flat minute was sized for checkout's single Stripe call and was too short for the other side — `switch` retrieves the subscription, creates and updates a schedule, syncs and then reconciles, and a claim that lapses mid-flight lets a second caller reclaim the row and run concurrently under a *different* `intent_id`, so the `:update` and `:schedule-update` keys no longer collide and the double proration the table exists to prevent comes straight back. 120 seconds sits above Vercel's 60-second function ceiling, so a request killed at its own timeout can never outlive its claim; raise it with `maxDuration` if that ever moves.

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

    **`customer_update: { address: "auto", name: "auto" }` is what makes "Checkout attaches it" true.** Passing an existing `customer` to a Session stops Stripe writing anything back to that Customer by default, so without this parameter the address lives on the session and its first invoice and nowhere else. Renewals are raised against the Customer, not the session, and Managed Payments prices VAT off the customer's address — so an address that never lands turns every renewal after the first into a tax calculation on nothing. This became reachable the moment the customer started being pre-created (FLOW-6); before that Checkout minted the Customer itself and the address was attached by construction.
- **A separate table, not a column on `user_plans`.** `plan` and `status` are `not null` so a customer-id-only row cannot be written there, and more importantly a **null `stripe_customer_id` on a granting row is the comped marker**. Writing a customer id into `user_plans` before purchase would silently un-comp hand-granted accounts. Nothing outside `syncSubscription` may write that column.
- **A stored customer id can go dead.** A Managed Payments data-deletion request cancels the customer's subscriptions and deletes the Customer, Subscription, Invoice and Charge objects **from our own account**; deleting a customer from the dashboard does the same to the Customer alone. Either way the id sits in `billing_customers` pointing at nothing until something notices.

    **A deleted customer is not a missing one, and only one call tells them apart.** `subscriptions.list({ customer })` returns `200` and lists that customer's subscriptions exactly as before when the customer is deleted; it raises `resource_missing` only for an id that never existed in this account and mode. `customers.retrieve` separates them — a deleted customer comes back `200` as `{ id, deleted: true }`, a non-existent one raises — while `checkout.sessions.create` refuses both with `No such customer`. `customerFor` therefore probes the id it is about to hand out through `isLive`, which treats `deleted: true` and `resource_missing` alike, so session creation runs against a customer that was proved live rather than merely assumed to be.

    **`replaceCustomer` forgets the row and mints a fresh customer with no idempotency key.** Reusing `customer:<userId>` inside its 24-hour window would replay the response containing the deleted id and loop for ever. Both dead paths route through it — the stored row and an adopted `user_plans.stripe_customer_id` — so the stable key is only ever spent on an account that has never held a customer at all. A brand-new customer has no subscriptions, so the empty list the checkout route then reads is correct rather than merely convenient. `customer.deleted` clears the row eagerly as well, after revoking the plan it belonged to — see the note under Events.

    **The stable key can itself hand back a customer that no longer exists, and probing the id it returns is not enough.** An idempotent replay serves the *original response body*, so a customer created yesterday and deleted since replays as a perfectly ordinary customer object with no `deleted` flag on it — recording that id and passing it to Checkout is how an account with an emptied `billing_customers` row walks straight back onto a dead customer and 500s. Deleting the test data in a Stripe sandbox produces exactly this: no customers left in the account, and a key that still replays one for another 24 hours. `customerFor` therefore reads `lastResponse.headers["idempotent-replayed"]`, and where the create was replayed it probes the id before recording it, falling back to `replaceCustomer` when the replay names something dead. A create that genuinely ran needs no probe, so the ordinary first purchase still costs one call.

    **The probe sits on `customers.retrieve`, and never on session creation.** `isMissingResource` only tests `code === "resource_missing"`, which cannot tell a dead customer from a `line_items` price that does not exist — a deploy pointed at another mode's `STRIPE_PRICE_*` raises exactly the same code. While the catch sat on `checkout.sessions.create`, that misfire deleted the `billing_customers` row and minted a fresh customer on every attempt before failing on the price again, scattering the account across customers — precisely the failure this table exists to prevent. A retrieve takes a customer and no other resource, so there the code is unambiguous. `subscriptionsOnCustomer` keeps a `resource_missing` catch of its own, but it is now a backstop rather than the guard: a deleted customer never raised there in the first place, and a non-existent id is caught a call earlier. The only surviving race is a deletion landing between the probe and session creation, which 500s once and self-heals on the next attempt.

**Checkout sessions live 30 minutes**, Stripe's minimum, against the 1–2 hours the bucketed key forced. See the SEC-6 note below.

- **A stalled attempt leaves no subscription.** Managed Payments authenticates the card *before* creating the subscription, so abandoning at the 3-D Secure prompt produces `customer.created`, `payment_intent.created` and `payment_intent.requires_action` — and nothing else. No subscription, no invoice. A `requires_action` PaymentIntent has captured nothing, so the residue is inert and needs no cleanup.

    **This is the opposite of standard Checkout + Billing**, where the subscription is created first and sits `incomplete` for 23 hours before expiring with its invoice voided. Stripe's own Billing docs describe that flow, and they also say expiring the session is how you cancel the subscription and void the invoice — all of which is true, and none of which applies here. Verified in test mode with `4000 0025 0000 3155`; re-verify if Managed Payments is ever turned off.

**Has a plan → `POST /api/billing/switch`**, never a second Checkout Session. Managed Payments does not allow creating a subscription outside Checkout, but updating one is fine. The body is `{ plan, when }`, where `when` is `"now"` or `"period-end"` and **defaults to `"period-end"`** — an unspecified request must never be the one that takes money.

**`switch` decides what the account is already on from the retrieved subscription, not from the row.** `planForPriceId(item.price.id)` is the live tier; if it already equals the requested one the change has landed and the route syncs and returns without calling Stripe again. Without that, a request killed after `subscriptions.update` had charged but before `syncSubscription` wrote left the row on the old tier, so the retry passed `same-plan`, minted a fresh `intent_id` on reclaim — and therefore a fresh idempotency key — and raised **a second full-price cycle invoice**. The same live tier drives the upgrade-versus-downgrade decision, and `subscription.cancel_at` / `cancel_at_period_end` drive the `cancelling` denial, for the same reason: `plan` and `cancels_at` on the row are mirrors of Stripe, and a mirror that has not caught up must not be what a money-moving call is routed on. The row's `same-plan` check stays as the fast path, answering the common case before any Stripe call.

**Releasing a schedule tolerates one that is already released.** `subscriptionSchedules.release` raises `subscription_schedule_status_invalid`, not `resource_missing`, on a `released`, `canceled` or `completed` schedule — so a schedule released in the Stripe dashboard, or by a racing request, 500'd `DELETE /api/billing/pending` before it could clear the mirror, leaving the banner up and every click on it failing for ever. `releaseSchedule` in `_shared.ts` re-reads on failure and treats anything no longer `not_started` or `active` as success, rethrowing otherwise. It re-reads rather than checking first so the happy path stays one call.

**`checkout`, `switch` and `pending` all set `maxDuration = 60`.** Vercel's default Node ceiling is 10 seconds, and `switch` runs up to five sequential Stripe calls, a read, an upsert and a full `reconcilePlanChange` — hundreds of `Room` writes for a Professional tutor. Being killed mid-flight was the normal case for a large account, and that kill is exactly what the retry above turns into a second charge. It is also the number the `switch` intent's 120-second `creating` window is sized against, so the two must move together.

#### Nothing is ever part-charged or part-refunded

**There are no prorations anywhere in this codebase.** A month of a tier is the unit that is bought, and every path either sells a whole one or sells none.

**Every call that could raise one says `proration_behavior: "none"` explicitly**, including the ones where nothing should prorate anyway: both `subscriptions.update` calls in `clearCancellation`, which change only cancellation fields, and the `subscriptionSchedules.update` in `switch`, which re-sends phases that have already started unchanged. Stripe's default on all three is `create_prorations`, so without the parameter the rule above held only because those calls happened not to change a price — a guarantee resting on what the surrounding code does rather than on what Stripe was asked for. Saying it costs one word and makes the invariant checkable by reading a single line.

This replaced `proration_behavior: "create_prorations"` on upgrades, which was not merely untidy — it was a hole. A proration is a *pending* invoice item, collected only when the next invoice is generated, and cancelling before that discards it. Basic at £5 → upgrade to Professional on day 2 → take unlimited lessons, six-seat rooms and 90-day retention for the rest of the month → cancel before renewal, and the £40 difference is never invoiced. Repeatable every month for £5. The `has-plan` guard has nothing to say about it and reconcile only clamps *after* the period already spent.

- **Immediate upgrade** — `proration_behavior: "none"`, `billing_cycle_anchor: "now"`, `cancel_at_period_end: false`. Stripe closes the old period with no credit for the unused part, starts a new one today, and invoices the new tier in full immediately. That is the whole trade stated plainly in the dialog: you pay a full month now, you do not get the rest of the old month back, and your billing date moves to today. The fresh `current_period_start` mints a fresh quota, which is correct here and only here — a full month was paid for.
- **Scheduled upgrade** — the same subscription-schedule machinery as a downgrade, with the new price on the next phase at `proration_behavior: "none"`. Nothing is charged on the click; the new tier and its full price land together at the renewal. This option exists *because* the immediate one forfeits the remainder of the current month: without it the only upgrade on offer is one that throws money away, and a tutor two days into a month has no good answer.
- **Downgrade is always scheduled to `current_period_end`**, whatever `when` says. Revoking a tier someone is paid up for is taking back a service already bought, so the client cannot ask for it sooner. The current phase keeps the current price to the period end, the next phase carries the new one, and `end_behavior: "release"` hands the subscription back afterwards. Nothing changes in `user_plans` at the moment of the click — the phase flip fires `customer.subscription.updated` and the webhook reconciles then, at exactly the right instant, with no cron.

**`billing_cycle_anchor: "now"` raises a cycle invoice, not an out-of-band one.** That distinction is what makes it usable under Managed Payments where `always_invoice` is not: the invoice it generates is the same kind a renewal generates, for a full period of a listed price, rather than a one-off for a part-period difference. Re-verify this if Managed Payments is ever turned off or its parameter support changes — it is the single Stripe assumption the new upgrade flow rests on.

**A failed immediate-upgrade invoice still upgrades the tier.** Stripe puts the subscription into `past_due`, which grants, so the user holds the higher tier for the dunning window without having paid for it. That is the existing `past_due` policy applied consistently rather than a new hole, and `switch` now refuses to run at all while `past_due` (below), so it cannot be chained.

    **The update resends every phase that has already started, not just the current one.** Stripe refuses to remove a phase once it has begun, and a schedule outlives its first flip — `end_behavior: release` fires when the *schedule* ends, so for the month after a change lands the subscription is still schedule-managed with a completed phase behind it. Rebuilding the array as `[current, new]` drops that completed phase and the second scheduled change of that window is rejected outright.
- **An immediate upgrade releases any existing schedule first.** That both unblocks `subscriptions.update`, which refuses to touch a schedule-managed subscription, and cancels a pending change, which is what someone upgrading today obviously means.
- **`switch` refuses outright while `past_due`**, through `pastDueDenial` in `_shared.ts`, with a 409 `{ reason: "past-due" }` whose toast names the fix. `past_due` grants entitlements — that is the whole point of the dunning window — so without this guard a tutor whose card has already bounced can raise their own price, and every path out of `past_due` is worse for having done so. Nothing about the denial takes anything away: they keep the tier they have while Stripe retries.

### Refunds do not cancel subscriptions — so we do

**Under Managed Payments a refund and a cancellation are unrelated events.** Refunds go through Onelink support; cancellation is the customer's own action in Onelink or our API call. Nothing ties them. Without a handler a customer asks Onelink for their month back, keeps their tier, and is billed again next month — repeatably.

**We are not always the one refunding.** Stripe's docs are explicit: "If you don't respond within 48 hours, Stripe might issue a refund without your approval." The Managed Payments dashboard also carries a setting — *Email me for approval* versus *Refund without emailing me* — and on the second there is no email at all. Any automatic rule here will occasionally fire on a refund we did not initiate. Check which setting the account is on before changing the policy.

`charge.refunded` therefore:

1. **Stops on a partial refund**, logging `billing:refund`. A part refund is a goodwill credit or a tax correction, not an exit. It matters under Managed Payments because a refund returns the customer's sales tax while we may still owe it — our balance drops by more than the refund, so a refunded month is worse than a month that never happened. The comparison is against `amount_captured`, not `amount`: a charge captured for less than it was authorised for reads as permanently part-refunded otherwise, and never cancels when it should.
2. **Stops on a full refund of a superseded invoice**, logging the same. Refunding month 3 of an active month-9 subscription is a correction; severing that tutor would run `reconcilePlanChange` against them mid-term, deactivating links and clamping retention.
3. **Otherwise cancels the subscription**, which fires `customer.subscription.deleted` and lands in the handler that already writes `cancelled` and reconciles. **One revoke path, not two** — nothing here writes `user_plans` directly.

**The already-cancelled guard is not optional.** A redelivered `charge.refunded` would otherwise throw on every retry Stripe makes, forever. `revoke` returns early on a `canceled` subscription and, if the cancel call races another delivery, re-reads and treats an already-cancelled subscription as success.

**`charge.invoice` no longer exists.** On current API versions the Charge carries `payment_intent` and nothing else that points at billing, so the route is `charge.payment_intent` → `stripe.invoicePayments.list({ payment: { type: "payment_intent", payment_intent } })` → the invoice → `invoice.parent.subscription_details.subscription`. This is the same class of removal as `invoice.subscription` above, and it fails at compile time rather than silently.

### Chargebacks

**Stripe owns the dispute; it does not appear to own the subscription.** Managed Payments handles disputes end to end — automated and manual review, evidence submitted on our behalf, and it may accept a dispute it judges unwinnable rather than contest it. Nothing in the documentation says the subscription is touched, and in standard Stripe the two systems are independent. `charge.dispute.created` therefore resolves the charge to its subscription by the same path as a refund and cancels.

**The superseded-invoice guard is shared with the refund path**, in `supersededInvoice`. It was on the refund side only, which left the two disagreeing about the same fact: a chargeback against month 3 of a live month-9 subscription severed a currently-paying tutor, while a refund of that same invoice deliberately did not. Given the note below that cancelling is irreversible and one-way, the asymmetry ran the wrong way round.

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

**A subscription read before a release is not written back after it.** `pending` retrieves the subscription, releases the schedule and then syncs — so the object it syncs from describes a state that no longer exists. `clearCancellation` re-fetches only when it actually issues an update, which masked it in the cases that mattered most, but writing a pre-mutation snapshot into the row the whole app reads is the wrong shape regardless. The subscription is re-retrieved after a release, and only after one.

**`DELETE /api/billing/pending`** releases the schedule and clears the mirror, which is the only way back from a scheduled tier change — before it existed the sole escape was to click Upgrade, which released the schedule as a side effect nobody would guess. It 409s `no-pending-change` when nothing is scheduled and no cancellation is pending, and it releases by id read from the subscription rather than from the row, so a schedule cancelled in the Stripe dashboard still clears locally.

### A pending cancellation is mirrored too

**`cancels_at` is the third mirror column, and it exists because a cancellation was completely invisible.** Cancelling through Onelink sets `cancel_at_period_end` rather than deleting the subscription, and nothing read it: the row stayed `active` on the old tier, `/pricing` kept showing **Current plan**, the dashboard badge stayed lit, and the first sign anything had happened was reconcile deactivating every student link on the day it landed. That is the one change that hurts most arriving with the least warning.

`syncSubscription` derives it on every sync from `subscription.cancel_at`, falling back to the item's `current_period_end` when only `cancel_at_period_end` is set, and writes null whenever the subscription is no longer live. Stripe stays the authority; the column just means the app can say so without an API call per render.

- **An immediate upgrade clears it.** `subscriptions.update` carries `cancel_at_period_end: false` alongside the new price, and `clearCancellation` in `_shared.ts` follows up with `cancel_at: null` if an explicit timestamp survives. Without that, a user who had cancelled and then upgraded would pay a full month up front for a subscription that still terminated on the old end date — taking money for something already set to stop.
- **A scheduled change is refused while a cancellation is pending**, 409 `{ reason: "cancelling" }`. There is no next period to schedule into, so the honest answer is to say so and name both ways out: keep the plan first, or upgrade now and start a new period today. The `/pricing` upgrade dialog hides its "start next period" option entirely for these accounts rather than offering a button that only ever 409s.
- **`DELETE /api/billing/pending` resumes it**, through the same `clearCancellation`, which is what makes the banner's **Keep <tier>** button work for a cancellation as well as a tier change. Both branches run in one request, so an account carrying a scheduled downgrade *and* a cancellation is put right in one click.

The banner reads off the same `readPlanRow` and renders whichever of the two is set, preferring the tier change when both are.

**The banner lives on `/pricing` for now**, above the tiers, and is rendered straight off `readPlanRow` — the page already loads that row for the highlight, so it costs no extra query. It belongs in Settings' current-plan section once that page exists; see `TODO.md`.

### The pricing page

`/pricing` lives in the `(home)` group, so it is public and carries the marketing chrome. It reads `auth()` — nullable, since signed-out visitors are the point — and then resolves everything it needs from a single `readPlanRow` when signed in: the granting tier for the highlight, whether any row exists, and whether a Stripe subscription exists. One uncached query, not three cached ones.

- **Comparison numbers are derived from `entitlementsFor`, server-side**, in `lib/plans/planComparison.ts`. The table can therefore never drift from `lib/plans/entitlements.ts`, which is the one thing a hand-written pricing table always gets wrong eventually.
- **The comparison table knows nothing about the current plan**, deliberately — it takes `rows` and nothing else. The tier card above it already carries the surface change and the **Current plan** badge; repeating that as a coloured column made the table read as a recommendation rather than a reference, and put two competing highlights on one screen. If the current tier ever needs marking here, it should echo the card's treatment rather than invent a second one.
- **Prose and prices live in `lib/plans/pricingCopy.ts`**, which is deliberately *not* `server-only` — the same reasoning as `lib/plans/labels.ts`. It holds display strings and no entitlement values, and its copy is the verbatim Stripe text at the bottom of this file.
- **`PlanActionButton` picks the endpoint off `stripe_subscription_id`, not off whether a plan grants.** `switch` → only with a real Stripe subscription; `checkout` → everything else; the current tier → disabled, but again only with a subscription behind it; signed out → the sign-in page with a redirect back. Every one of those is re-derived server-side, so a client that chooses wrong gets a 409 rather than a double charge.

    **Keying this on `currentPlan !== null` is the bug to avoid**, and it is not hypothetical — it was the first thing to break in testing. A hand-seeded row (the `insert into user_plans` at the bottom of this file) grants a tier with both Stripe ids null, so the client called `switch`, which requires a subscription id, and every seeded account got `no-subscription` with no way forward. Seeded accounts are the *normal* state of every account that predates Stripe, including your own. The page therefore resolves all three facts from one `readPlanRow`: the granting tier, whether any row exists, and whether a subscription exists.

    A row with no Stripe behind it consequently shows **Choose** on all three tiers, including the one it is on. Both routes then refuse — see comped plans below. The buttons are deliberately left saying the wrong thing: the accounts this affects are hand-granted ones belonging to people who already know it, and a fourth button state for them would be carrying UI weight for an audience of a handful.
- **Both switches go through a confirmation dialog**, each with its billing note in an inset `bg-background-second` panel. The downgrade keeps one panel and one confirm: nothing is charged or refunded today, and the next invoice is the first at the lower price.

    **The upgrade dialog is where the money decision is actually made**, so it is two panels and two confirms rather than a warning. *Upgrade now* names the price and says all three consequences in order — charged in full today, billing date moves to today, the rest of the current month is not refunded. *Upgrade on <date>* says nothing is charged today and the new tier and its price arrive together at the renewal. The second option exists because the first forfeits the remainder of a month already paid for; offering only the immediate one would make every mid-month upgrade a bad deal with no alternative, which is the sort of thing users discover on a statement.

    The dialog's own description carries the rule the whole flow rests on — plans are never part-charged or part-refunded — because that is the premise that makes both options legible, and it is the opposite of what a user who has met proration elsewhere will assume. Only the downgrade's confirm is `destructive`. **Choose** still has no dialog, because Checkout states the price itself on the next screen.

    **`currentPeriodEnd` reaches the client for this**, threaded from the same `readPlanRow` the page already loads, purely so the scheduled option can name a real date rather than "your next renewal". It is display, like every other number on this page.

- **An account with a pending cancellation is offered only the immediate upgrade.** The scheduled panel and its button are dropped rather than disabled, because there is no next period to schedule into and `switch` would 409 `cancelling` if asked. The reverse case — a downgrade while cancelling — deliberately keeps its dialog and lets the server refuse: the denial copy names both ways out, and duplicating that policy client-side would give two places to disagree about it.
- **With no plan, all three buttons rest on `outline` and lift to the `default` fill on card hover**, driven by `group/plan` on the card and `group-hover/plan:` on the button. Three solid white buttons side by side made every tier look equally urged; resting them grey and brightening only the card under the cursor turns the row into a choice. The class list ends with `hover:bg-primary/90`, which is not redundant — `cn()` uses it to displace the `outline` variant's own `hover:bg-foreground-third/35`, so hovering the button cannot fight the card rule. Buttons for a user who already has a plan are left alone: their card is already marked, and lifting a downgrade button on hover would advertise it.

    **The lift keys on `currentPlan`, not on `hasSubscription`.** It was keyed on `switching` at first, which handed a hand-granted row — a granting tier with both Stripe ids null — the entire no-plan treatment: three cards lifting under the cursor, urging a purchase at someone who already has the tier and whose card right above the button carries the **Current plan** badge. Which endpoint the button calls is a Stripe question; whether the row reads as a sell is a plan question, and comped accounts are exactly where the two part company. `PricingTiers` already keyed its `ACTIVE_SURFACE` and badge off `currentPlan === plan`, so the button was the only piece disagreeing with the card around it.
- **No trial is offered anywhere on the page** while the product is in beta. `trialing` is a status the table already grants and `syncSubscription` passes through, but nothing sets it; the trial work lives in `TODO.md`.

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
    cancels_at             timestamptz,
    reconcile_pending      boolean not null default false,
    updated_at             timestamptz not null default now(),
    last_event_at          timestamptz
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

### Migration for pending cancellations and the reconcile latch

```sql
alter table user_plans add column if not exists cancels_at timestamptz;

alter table user_plans add column if not exists reconcile_pending boolean
    not null default false;
```

**No backfill, and do not seed `reconcile_pending` true.** Both columns are written by `syncSubscription` on the next event for each subscriber, and `cancels_at` is derived from Stripe every time rather than accumulated, so a null is simply "not known yet" and corrects itself. Backfilling the latch would queue a reconcile for every account at once on the next webhook burst.

**`cancels_at` is a mirror, never an authority.** Nothing reads it to decide whether access continues — that stays with `status`, which the `customer.subscription.deleted` handler writes when the cancellation actually lands. It exists so the app can warn, and so `switch` can refuse a change that has no period to land in.

### Migration for the event watermark

```sql
alter table user_plans add column if not exists last_event_at timestamptz;
```

**No backfill, and copying `updated_at` into it would be actively wrong.** Half the rows carry an `updated_at` written by `switch` or `pending` rather than by an event, which is the precise confusion the column exists to undo — seeding from it would re-create the bug on exactly the accounts that had a plan change. A null means "no event processed yet" and never drops anything, so the first webhook per account sets the watermark and every later one is ordered against it. The cost is that the one event immediately following the migration is unguarded, which is the pre-existing behaviour for a single delivery.

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
