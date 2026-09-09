# Environment Variables

Create `.env.local` with:

- `NEXT_PUBLIC_REALTIME_URL` (e.g. `wss://realtime.chalkiechalkie.com`, or `ws://localhost:8787` against `wrangler dev`), `REALTIME_TICKET_SECRET`, `REALTIME_ADMIN_SECRET` — the last two are shared with the Worker and set there with `wrangler secret put`. `lib/realtimeAdmin.ts` derives its HTTP origin from `NEXT_PUBLIC_REALTIME_URL` by swapping the `ws` scheme, so the two can never drift apart
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`
- `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` — Cloudflare R2, where every pasted image and rasterised PDF page is stored. The API token needs **Object Read & Write** on that bucket and nothing more. The bucket must stay **private**: no public dev URL, no unauthenticated custom domain, since the app's own route is the only thing that authorises a read (see Image Storage & Serving below)
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`)
- `NEXT_PUBLIC_MAX_IMAGE_WIDTH`, `NEXT_PUBLIC_MAX_IMAGE_HEIGHT`, `NEXT_PUBLIC_IMAGE_QUALITY` — the box every image and PDF page is scaled into, and the JPEG quality it is encoded at. All three are optional, defaulting to `2048`/`2048`/`0.85` in `lib/imagePrepare.ts`. **Client-side, so advisory only** — a tampered value still meets the route's 413 and the storage bucket's own limit. `NEXT_PUBLIC_` is inlined at build time, so changing one needs a rebuild, not just a redeploy
- `RESEND_API_KEY`, `CONTACT_EMAIL`
- `CRON_SECRET`
- `VERCEL_TOKEN` — Vercel access token used by the nightly promotion cron; `VERCEL_TEAM_ID` as well if the project ever moves off a personal account. `VERCEL_PROJECT_ID` comes free from Vercel's system environment variables.
- `ENVIRONMENT` — set to `testing` to render the dashboard from `data/testWorkspaces.json` instead of live API data
- `DEBUG` — set to `true` to show the Tailwind breakpoint badge (`components/DebugBreakpoint.tsx`) in the bottom-left of every page. Server-only on purpose, so the flag never reaches the client bundle
- `ALLOWED_DEV_ORIGINS` — the LAN address (e.g. `192.168.1.227`) `next dev` should accept cross-origin requests from, so the dev server is reachable from a phone or another machine on the network. Read in `next.config.ts`; **one origin only** — the value is passed straight through as a single array entry, so a comma-separated list would be treated as one bogus host
