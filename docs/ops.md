# Deployment & Operations

## Deployment (staged, promoted nightly)

**The realtime Worker deploys on a different clock to the app.** `wrangler deploy` is immediate; a push to `main` sits `STAGED` until promoted. A protocol change therefore goes live against a client that may not speak it for up to a day unless the Vercel build is force-promoted in the same window. There is no version negotiation — the Worker speaks exactly one protocol, and `chalkie.v1` is a label rather than a compatibility mechanism.

Pushes to `main` build but **do not go live**. The Vercel project has **Auto-assign Custom Production Domains** turned off (Project Settings → Environments → Production → Branch Tracking), so each push produces a production deployment in the `STAGED` substate serving no traffic. `app/api/cron/promote-latest` promotes the newest staged build overnight, so a mid-afternoon push can't interrupt a lesson in progress.

- Scheduled `0 0 * * *` in `vercel.json`. Vercel cron expressions are UTC-only and DST-blind, and Hobby-plan crons only fire to within the hour, so the real window is roughly 00:00–02:00 UK local depending on the season. That imprecision is accepted deliberately — it is all outside tutoring hours, and pinning it tighter costs a second cron entry and a DST guard for no practical gain.
- Crons invoke the **currently live** deployment, i.e. the one _before_ whatever is about to be promoted. Changes to `promote-latest` itself only take effect the night after they go live, and the first deploy containing the route has to be promoted by hand once to bootstrap it.
- Vercel API access lives in `lib/vercelDeployments.ts`. Promotion is an alias swap, not a rebuild.
- **`readySubstate === "STAGED"` is not "waiting to go live" — it is permanent for every push that was never promoted.** Push three times in a day and that night's run promotes the newest, leaving two candidates that never expire; a later night with nothing new then promotes one of _those_, walking production backwards a commit per night. So the newest staged build is only promotable if it is **newer than the live one**, read from `targets.production` on `/v9/projects/{id}` (`fetchLiveProductionDeployment`). Never gate on the substate alone.
- To ship something urgently, promote by hand in the dashboard; the cron then finds nothing newer than live and no-ops.

## Rate Limiting

`lib/ratelimit.ts` is the single source of truth: a `RATE_LIMITS` table mapping each route key to `{ keyBy: "userId" | "ip", limit, window }`, enforced via Upstash sliding window (`enforceRateLimit` returns a 429 Response or null). Fail-open if Upstash is unreachable, with the outage reported. Every API route calls this before doing work.

`enforceRateLimit` takes an optional `cost`, passed through as `limit(id, { rate: cost })` — supported by `slidingWindow`, whose Lua script takes an `incrementBy`. It buys a whole batch in one decision, so the caller gets all of it or none: a PDF learns it is over budget before rendering a page, rather than dying halfway through.

**PDF page uploads spend a lease, not a token** (`lib/pdfLease.ts`). `images/reserve` charges `pageCount` against `workspace-pdf:upload` and writes a Redis counter keyed `chalkie:pdflease:{userId}:{workspaceId}:{leaseId}`; each page upload sends that id in an `x-pdf-lease` **header** and the route spends it with a single atomic `DECR`.

- **Identity lives in the key, never the value.** `userId` comes from Clerk and `workspaceId` from the URL, so a forged or borrowed `leaseId` addresses a key that was never created, `DECR` returns `-1`, and it reads as exhausted. `DECR` also conjures that key with no TTL, so the miss branch deletes it.
- **A header, not a form field**, so the route can decide before parsing the body — otherwise the limiter would have to run after `req.formData()`.
- **An invalid lease falls through to `workspace-image:upload`**, never to an error. The worst outcome is being charged per page like a plain paste.

## Changelog & Version

`data/changelog.json` is the only place a version number is written. It is `{ title, currentVersion, intro?, entries[] }`, where each entry is `{ version, date, changes[] }` and a change is either a bare string or `{ tag, text }` with `tag` one of `Added | Fixed | Changed | Removed`. `components/changelog/ChangelogDocument.tsx` renders it at `/changelog`, reusing the policy pages' inline markup and the `Badge` primitive's variants for the tags — no colours of its own.

- **Entries render in file order**, so author the newest at the top. Nothing sorts or parses `version`; the anchor id is just the version slugified.
- **`currentVersion` feeds the app's version tag.** `next.config.ts` reads it and exposes it as `NEXT_PUBLIC_VERSION`, which is what the dashboard `Sidebar` prints. Config `env` wins over a `.env` file, so any leftover `NEXT_PUBLIC_VERSION` there is inert — delete it rather than trusting it.
- **That indirection is deliberate.** The `Sidebar` is a client component, and a JSON import from one bundles the whole file: importing the changelog to read a single string shipped every release note to every dashboard visitor. Do not "simplify" this back into a `lib/` module that imports the JSON.
- Being build-time inlined, a version bump needs a rebuild — already true, since `/changelog` is statically prerendered.
- `app/sitemap.ts` lists the page with `lastModified` taken from the newest entry's date, parsed by the same UTC-safe helper the policies use.

## Error Handling

`lib/errorResponse.ts` — `reportError` logs to console and persists to the Supabase `error_logs` table; `errorResponse` is the single chokepoint for API catch branches, returning a consistent `{ error }` JSON shape. Use these instead of raw `console.error` in API routes.
