# Routes & API

## Route Structure

- `app/(home)/` — Public landing page (hero, beta sign-up, contact) with its own `Navbar` + `Footer` layout
- `app/(home)/pricing/` — The three tiers, a comparison table, and the button that starts checkout. Public, but reads `auth()` so a signed-in tutor's tier is highlighted; see [docs/plans.md](plans.md)
- `app/(legal)/` — `privacy-policy`, `terms-of-service`, `cookie-policy`; content authored as JSON in `data/policies/` and rendered by `components/policy/PolicyDocument.tsx`. `changelog` also lives here despite not being a legal page: it wants exactly this layout's `Navbar` + `Footer` chrome, and a route group affects nothing but which layout wraps the page (see Changelog below)
- `app/dashboard/` — Authenticated dashboard: upcoming/past lessons, filters, workspace create/edit modal (`components/dashboard/`)
- `app/dashboard/connections/` — Tutor↔student linking: "Your Students" (tutor) / "Your Tutors" (student), invite-code exchange in a Dialog (`components/dashboard/connections/`)
- `app/dashboard/settings/` — Plan, Billing and Danger zone for the signed-in user (`components/dashboard/settings/`); admins get an empty state. See [docs/dashboard.md](dashboard.md)
- `app/board/[boardId]/` — The whiteboard canvas page; wraps `<Workspace>` in the realtime `<Room>` provider (`Room.tsx`)
- `app/sign-in/` — Clerk sign-in page (styled via `lib/clerkAppearance.ts`)
- `app/style-guide/` — Admin-only design system reference (see above)
- `app/forbidden/` — Shown when a user fails workspace access (403 from realtime-auth)
- `app/checkout/success/` — Stripe's `success_url` after a first purchase, `/checkout/success?plan=<PlanId>`. A static thank-you on `dotted-paper` naming the plan from `PLAN_LABELS`; it does not poll or read `user_plans`, since the webhook normally lands before the redirect. `plan` is cosmetic only, and anything that is not a `PlanId` 404s
- `app/not-found.tsx` — 404, also what unauthorised style-guide requests render
- `app/api/` — Backend routes:
    - `realtime-auth` — issues a 60-second HMAC ticket after the membership check, **the access-window check** (see Workspace Lifecycle below) **and the host's plan check**, and is the only writer of `Room.last_activity_at` besides workspace-create, and of `Room.opened_at`
    - `workspaces` (+ `[workspaceId]`, `[workspaceId]/images`, `[workspaceId]/images/[imageId]`, `[workspaceId]/images/reserve`) — workspace CRUD, pasted-image upload/delete, the authorising image-serve redirect, and the PDF page-quota reservation; workspace-body validation in `workspaces/_shared.ts`, and the id/membership guards the three image routes share in `images/_shared.ts`
    - `users/batch`, `users/friends`, `users/workspaces` — user lookups; `friends` returns the caller's linked tutor-student counterparties (see below), not a general user search. `batch` returns anyone sharing a workspace with the caller but strips `email` from every profile except the caller's own and their directly linked counterparties, so co-students in a group lesson never see each other's addresses. `users/workspaces` annotates each row with `host_has_plan` from one batched `user_plans` query, so a student's dashboard can say "Tutor's plan ended" rather than offering a Join that 403s
    - `links` (+ `[linkId]`, `invites`, `redeem`) — tutor↔student linking: list/unlink, generate/read/revoke an invite code, redeem a code; shared validation in `_shared.ts`. `[linkId]` PATCH takes `{ active }` and is the soft-lock swap a tutor left over their plan's cap uses — tutor-side only, and re-checks the cap so activating can never raise the active count past it (see [docs/plans.md](plans.md))
    - `admin/reconcile-plan` — applies a plan change to everything the user already owns. POST `{ userId }`, guarded by `requireAdmin` and deliberately unrated. The Stripe webhook reaches the same `reconcilePlanChange` through `lib/plans/syncSubscription.ts`, so this route is now a manual override rather than the only caller
    - `billing/checkout`, `billing/switch`, `billing/pending`, `billing/webhook` — Stripe. `checkout` opens a Managed Payments Checkout Session for a user with **no** active subscription and 409s `{ reason: "has-plan" }` otherwise — the row is the fast path, but the guard that actually holds is a `subscriptions.list` against the account's Stripe customer once the intent is claimed, since a dropped webhook leaves no row to read; `switch` moves an existing subscriber between tiers, taking `{ plan, when }` — an upgrade runs either immediately (charged in full, billing date reset) or at the period end, a downgrade is always scheduled to the period end whatever `when` says; `billing/pending` DELETE cancels a scheduled tier change **or a pending cancellation**, and is the only way back from either; `webhook` is the only writer of `user_plans`. Plan validation is shared in `billing/_shared.ts`. **All three write routes claim a `billing_intents` row in Postgres before calling Stripe**, so one account can only have one billing operation in flight and every Stripe mutation is keyed off that row — the only Redis on the payment path is the best-effort plan-cache delete after a row write, which never fails its caller. The webhook is unauthenticated by design — Stripe cannot hold a session — and gated on `stripe.webhooks.constructEvent` instead. A bad signature gets an opaque 400 that tells a prober nothing, the same attitude as `realtime/src/ticket.ts`, and is reported as `billing:webhook-signature` at most once per instance per ten minutes so a wrong `STRIPE_WEBHOOK_SECRET` is visible without handing a prober a way to flood `error_logs`. **It carries no rate limit at all**, deliberately: the signature check runs first, so unsigned traffic is already rejected and the only requests that could ever spend a budget are genuine paid-for events. A limiter there can only drop revenue. See [docs/plans.md](plans.md)
    - `billing/cancel` — POST, sets `cancel_at_period_end` on the live subscription after releasing any schedule, so a scheduled tier change is dropped in favour of the cancellation. Shares the `switch` intent claim and rate limit shape. See [docs/plans.md](plans.md)
    - `account` — DELETE, full account deletion behind Clerk `strict` reverification and the typed phrase. See [docs/access-control.md](access-control.md)
    - `report` — Report a concern (`components/ReportConcernDialog.tsx`). Public so a parent without an account can use the Footer entry: signed in it is rate-limited per user and the server attaches the reporter's id, so nobody can report as someone else; signed out it is rate-limited per IP and requires an email instead. A `workspaceId` is only accepted when the caller is in that room's `user_ids`, and a `reportedUserId` only when it is another member of that same room — a signed-out report ignores both. Every report is inserted into `concern_reports` **before** the Resend email to `CONTACT_EMAIL`; a failed email is reported as `report:notify` and still returns success, because the row is the record. Account deletion deliberately leaves these rows alone. Schema below
    - `contact` — contact form via Resend. Public and unauthenticated by design: a `{title, body}` relay, so the beta request and the bug report share it and a new form needs no new route
    - `cron/remove-unused-rooms` — deletes rooms whose `expires_at` has passed (see Workspace Lifecycle below); runs daily at 05:00 via `vercel.json` crons, authenticated with `CRON_SECRET`. Reads in batches of 500 because PostgREST caps a request at 1000 rows, and re-reads from the top each time rather than paging by offset, since deleting a room removes it from the result set. A room whose teardown throws is held aside so a batch of nothing but failures ends the drain instead of looping on it, and the whole loop stops at a 45-second budget — under Vercel's 60-second default, with the remainder still expired tomorrow
    - `cron/promote-latest` — promotes the newest staged production build to live (see Deployment below)

`concern_reports` is service-role only (RLS on, no policies), and has no foreign keys so a report outlives the workspace and accounts it names:

```sql
create table concern_reports (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    reporter_id text,
    reporter_email text,
    category text not null check (category in ('behaviour', 'content', 'other')),
    workspace_id text,
    reported_user_id text,
    details text not null,
    status text not null default 'open' check (status in ('open', 'actioned', 'closed')),
    resolution text,
    check (reporter_id is not null or reporter_email is not null)
);

alter table concern_reports enable row level security;
```

`status` and `resolution` are written by hand in the Supabase dashboard when a report is dealt with — they are the record of what was done about it.

`proxy.ts` is the Clerk middleware: protects `/board(.*)`, `/dashboard(.*)` and `/checkout(.*)`. `/style-guide` is deliberately **not** listed there — a middleware redirect to sign-in would advertise that the route exists, so the page gates itself and 404s instead.
