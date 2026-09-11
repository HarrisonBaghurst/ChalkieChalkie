# Dashboard

## Dashboard Actions

The dashboard offers **at most one action per page**, derived from route × role in `lib/dashboardActions.ts` and rendered by the `Sidebar`'s Actions section at `md+` and the `TabBar`'s floating button below it.

|         | `/dashboard`     | `/dashboard/connections` |
| ------- | ---------------- | ------------------------ |
| tutor   | Create workspace | Add a student            |
| student | —                | Add a tutor              |
| admin   | —                | —                        |

- **One home per tier.** No page renders its own action button; both surfaces read the same helper. The rule used to be written out in each of them, which is how one action came to be called both "Add New Student" and "Link a student".
- **Absent, not disabled, when the page can't land the result.** Each page passes only the callback its own action needs — `/dashboard` passes `onCreated`, connections passes `onLinked` — and the button (plus its modal) is omitted otherwise. Greying it out instead is what put a dead "Create Workspace" on the connections page.
- Menu items use `opacity-25` for "not for your role"; an unbuilt destination carries a `Soon` badge instead, and the dimming sits on the icon and label rather than the row so the badge stays legible.
- **Pointing at the action is how everything else asks for it.** `GettingStarted` needs to offer "add a tutor" and "create a workspace", and mounting its own `LinkCodeDialog` would have made the page a second home for them. Instead a row links to `${path}?highlight=${actionId}`, and `useActionHighlight` (consumed by both `Sidebar` and `TabBar`) rings and pulses the existing button for 2.5s before `router.replace(pathname)` strips the param. Stripping is what lets a second click re-trigger, and it keeps `?highlight=` out of history. A URL param rather than context or module state because **each page mounts its own `DashboardShell`** — anything set before navigating is unmounted on arrival. Reach for this before adding a button; the rule above only holds if nothing else opens these modals.
- **The rail needs the label too.** Collapsed, the action is an icon-only button, so `RailTooltip` takes an `open` prop and the highlight forces it open — a ring around an unlabelled icon teaches nothing. In panel state `railTooltipClass` is already `hidden`, so forcing it open there renders nothing, which is correct.
- Every highlight target is guaranteed to exist: `resolveDashboardAction` returns an add-link action on connections for both roles and `CREATE_WORKSPACE` on `/dashboard` for tutors, which is the only role with a create row. Both pages already pass the callback `actionReady` demands, so the button is never absent when a row points at it.

## Getting-started Checklist

`components/dashboard/GettingStarted.tsx` is one component in three presentations, resolved by `resolvePresentation` in `lib/gettingStarted.ts`. It is the only empty state either dashboard page has, and it is **not only** an empty state — it outlives the takeover.

| Condition | Presentation |
| --- | --- |
| `startedCount > 0` | `hidden` — the first lesson has run, nothing left to teach |
| the page has no content of its own | `page` — checklist over the real page, on a dimmed backdrop |
| otherwise | `card` — checklist beside (dashboard) or above (connections) the real content |

- **"Content of its own" is per page**, which is the whole rule: connections has content once `linkCount > 0`, the dashboard once `workspaceCount > 0`. So a linked student with no lesson yet gets a table on connections and still a full-page checklist on `/dashboard` — each page graduates when *it* has something to show.
- **Three counts drive both pages** — `linkCount`, `workspaceCount`, `startedCount` — and both fetch all three. `ConnectionsClient` calls `/api/users/workspaces` alongside `/api/links` **unconditionally**: the card outlives the empty state, so the counts are needed in the `card` state too, not only when the page is bare.
- **`startedCount` is a proxy.** Nothing records attendance, so a workspace whose start time has passed (the `DASHBOARD_GRACE_MS` cutoff, matching `previousAll`) is the only observable signal. Row 3 therefore ticks for a lesson nobody joined — and that is also what retires the whole checklist. Accepted: it is a nudge list, not a record.
- **Only the next incomplete row gets a CTA.** `resolveChecklist` strips `href`/`cta` from every other row, so a student with no tutor is never offered "join your first lesson".
- **`loading` on both pages now means "every fetch settled"** (`Promise.all`). `fetchFriends` used to be fire-and-forget and never touched `loading`, which would flash row 1 unticked for someone who does have tutors. The fetches were already parallel and the workspace path is the slower of the pair, so this costs no real latency.
- **`page` is an overlay, not a replacement.** `GettingStartedTakeover` (exported from `GettingStarted.tsx`) goes through `DashboardShell`'s `overlay` prop, which renders it *inside* the content column and caps that column at viewport height. The real page — skeleton, then the genuine empty dashboard — renders underneath it the whole time. This is what fixed the loading state: the skeleton no longer has to predict which presentation it is about to become, because there is only one layout under the checklist now. Both clients gate the overlay on `ready` (`!loading && isLoaded`), which is load-bearing — the counts are all zero mid-fetch, so `resolvePresentation` returns `page` for *everyone* until the fetches land.
- **Everything the checklist points at stays reachable, which is why this is not a `Dialog`.** The CTAs deep-link to `?highlight=`, and `useActionHighlight` rings the button in `Sidebar` or `TabBar` — a focus trap or a scroll lock on the chrome would break the one flow the checklist exists to drive. So: no Radix, no Escape, no dismiss-on-outside-click. The overlay is presentational, and the dim stops at the content column by geometry rather than by z-index: the sidebar is a *sibling* of that column, so the overlay never covers it, and `Navbar`/`TabBar` are `fixed z-40`, above the overlay's `z-30`. All three stay at full brightness and stay clickable, which is the point.
- **`bg-background/80`, the same dim `DialogOverlay` uses, and no blur.** A `backdrop-filter` was tried and removed: `--background` (`#121212`) and `--card-background` (`hsl(0 0% 12%)`) are about five lightness steps apart, so at 80% fill there is not enough contrast left behind the overlay for blur to be visible — it costs a compositor layer to look identical to a plain dim. Dropping the fill far enough to show it (~60%) would have meant a visibly weaker dim on every modal in the app.
- **The scroll lock is the height cap, not JavaScript.** With the column pinned to `max-h-dvh` (`md:max-h-[calc(100dvh-1rem)]`) and `overflow-hidden`, the document is exactly one viewport tall, so nothing scrolls and the centred panel cannot drift off-screen. No `body` mutation, nothing to unwind on unmount. The overlay itself is the one thing that *can* scroll — `overflow-y-auto` over a `min-h-full` centring wrapper, so a checklist taller than a short phone scrolls inside the overlay instead of being clipped by the cap. `overscroll-contain` keeps that from chaining back out to the page.
- **The "you have mis-filtered" guarantee is gone, deliberately.** `WorkspaceLists` now renders underneath in `page`, so `Upcoming 0 / Previous 0` above a disabled Clear filters button *does* exist — dimmed, and behind an opaque panel that covers the middle of the viewport, but legible at the edges. The earlier rule bought that guarantee by unmounting the lists, and the price was a skeleton that could not match the layout it resolved into. Correct loading won. If it ever reads wrong, the lever is the overlay's fill, not going back to unmounting. The filtered-to-empty case still has `workspaceCount > 0` and keeps `DataTable`'s "No sessions" cell; the two must not converge.
- **Admin gets none of it** at any stage — no product privileges means a checklist of things they cannot do. `/dashboard` keeps its normal tree, connections keeps its own unsupported-role panel.
- **The tutor-access button shows only while a student has no linked tutor** (`linkCount === 0`). That is the window where the account is plausibly a tutor who signed up and got the default role; once they have linked one they are on the student path and the pitch is noise. It opens `StepperFormDialog` directly — an earlier version swapped the card to an inert tutor-checklist preview first, which put a second button between the student and the form for no decision they had to make.
    - **Known gap:** this is the only route to tutor access anywhere in the app, so a student who links a tutor and *then* decides they want to teach has no way to ask. Acceptable while promotion is a manual Clerk edit; a Settings page or the paid-tier flow is where that path should land rather than widening this condition.

### Pairing with `Next`

In `card` on `/dashboard` the checklist is a flex sibling of `Next`, sized by `dashboardCardRow(collapsed)` and `<Next paired />` — both exported from `Next.tsx` so the breakpoint literals stay next to `nextCardWidth`, which they must track.

- The row goes side-by-side at exactly the breakpoint where `nextCardWidth` stops being `w-full` (`lg` railed, `xl` panelled). Two `flex-1` children of a `w-full` row are half-width each, and of a `2xl:w-2/3` row a third each — so the paired cards land on the widths `Next` already uses alone, rather than on a second set of literals.
- `paired` swaps `Next`'s width for `h-auto flex-1 min-w-0`. The `h-auto` is load-bearing: `CARD_CLASS` carries `h-fit`, which would otherwise beat the row's `items-stretch` and leave the two cards unequal. Same reason the empty branch takes `min-h-50` instead of `h-50` when paired.
- `DashboardCardRow` exists only because `DashboardClient` renders the provider and so sits **above** the collapse context — it cannot call `useSidebarCollapse` itself.

## Responsive Model (dashboard)

The dashboard is **mobile-first with a single layout seam at `md`**. Below it, the phone layout; at `md` and above, the desktop layout described throughout this file. A portrait tablet therefore gets the desktop tree.

`lg` still appears in the dashboard, but it is a **second, narrower seam that decides one thing: how wide the sidebar starts.** Keep the two apart — a `lg:` added for layout reintroduces the tablet gap this seam was moved to close.

- Breakpoint swaps are **CSS-only** (`md:hidden` / `hidden md:block`), never a media-query hook: both trees mount, which avoids hydration mismatch and first-paint flash, and lets each tree keep behaviour the other doesn't have.
- **Nothing below `md` links to `/board`.** The canvas is desktop-only for now and this is enforced by omitting every link — the `Next` card is inert, rows open a detail sheet, and "Join workspace" is absent from the mobile actions. There is no route guard; opening a board URL directly still works.
- **A tablet clears `md`, so the desktop tree must not assume a mouse.** Anything readable only on hover needs a tap path: `components/TapTooltip.tsx` keeps hover on a fine pointer and adds tap-to-open on a coarse one, decided per interaction from `pointerType` rather than a media query. Plain `Tooltip` is still fine for a label naming an action its trigger already performs.
- **The desktop workspace row does not open the board on click.** Joining goes through the row's `⋯` menu or the `Next` card, so a stray tap on a tablet can't drop someone into a lesson.
- Each table has a mobile counterpart in `components/dashboard/mobile/`: a compact row list whose rows open a `Sheet` holding the detail and actions that depend on hover at desktop.
- The `Sidebar`'s Actions are unreachable below `md`, so `TabBar` carries them on a floating action button, picking one action from the current page and role. In the rail they survive as an icon-only button with a tooltip (see Sidebar Collapse below).
- Bottom-flush chrome uses the `.pb-safe` utility (see `app/globals.css`), which needs `viewportFit: "cover"` from `app/layout.tsx`.

## Sidebar Collapse

The sidebar is either a `w-17` icon rail or a `w-75` panel, and which one is **tri-state**: `lib/sidebarCookie.ts`'s `CollapseState` is `true` (rail), `false` (panel) or `null` (no cookie yet). Every consumer goes through `byCollapseState(collapsed, rail, panel, auto)` in `components/dashboard/sidebarCollapse.ts`, which picks a class string per state; `DashboardShell` holds the state and publishes it plus `toggle` on a context.

- **`null` is not a third look, it is "let CSS decide"** — the `auto` argument is always a breakpoint pair (`w-17 lg:w-75`, `hidden lg:block`, `-rotate-90 lg:rotate-90`), so an untouched sidebar is a rail on a tablet and a panel on a desktop, from one server-rendered markup with no media-query hook and no flash. This is the **only** place `lg` means anything in the dashboard.
- **The cookie is written only by `toggle`**, and from then on the state is absolute at every width: a user who collapsed it on a desktop still gets a rail on their phone-sized window. Deliberate — an explicit choice outranks the width heuristic.
- **`toggle` resolves `null` by reading `matchMedia("(min-width: 64rem)")`**, i.e. by asking what the auto CSS is currently showing, so the first click always flips what the user can see. That literal must track the `lg` in the auto strings; Tailwind's breakpoints are stock, so `lg` is 64rem.
- **Read server-side** by `lib/serverSidebarCookie.ts` and passed as `initialCollapsed`, so the first paint is already the right width. The cookie is scoped to `Path=/dashboard`.
- Rail state hides every label, so anything added to the sidebar needs a `RailTooltip` alongside it or it becomes an unlabelled icon.

## Data Table

Both `md+` tables — the dashboard's and `/dashboard/connections`' — and both their loading skeletons render through `components/dashboard/DataTable.tsx`. It replaced four verbatim copies of the same `<table>`/`<th>` markup, so put new table behaviour there rather than in a caller.

- **Columns are data.** `lib/tableColumns.ts` defines `TableColumn { key, label, minWidth, grow?, pin? }`; `dashboardTableColumns.ts` and `connectionsTableColumns.ts` are `as const satisfies` arrays of it. `DataTableRow` takes a `Record<key, ReactNode>` and maps the config to `<td>`s, so **a column's position is never written down in a row component** — reordering or hiding one is a config change, which is what the planned Settings control needs.
- **The header and the rows are two separate `<table>`s.** An element with `overflow-x: auto` also computes `overflow-y: auto` and so becomes a scrollport, and `position: sticky` resolves against the nearest scrollport — a `<thead>` inside the horizontally-scrolling wrapper could therefore only ever stick to that wrapper, which has no vertical scroll, and would ride off the top of the page. They stay aligned because both are `table-fixed` with the same derived `<colgroup>` and the same `min-width`; `sync()` mirrors the body's `scrollLeft` onto the header on every scroll. Do not merge them back.
- **Widths are minimums, not percentages.** `<col>` widths are percentages of each column's `minWidth` (or `grow`), and the table carries `min-width: Σ minWidth`. Above that total the columns share the surplus in proportion; below it each sits at its minimum and the body wrapper scrolls. `table-fixed` is what keeps `truncate` working in either regime.
- **`pin` freezes a column to an edge** — `left` for the workspace title and the connection's person, `right` for the row menu, so a row stays identifiable and its actions stay reachable at any scroll position. Pinned cells carry an opaque background and an edge shadow gated on `data-scroll-start` / `data-scroll-end`, which `sync()` writes straight to the DOM rather than through state so a long table doesn't re-render per scroll frame.
- **The sticky block holds the toolbar too.** `WorkspaceControls` is passed in as `toolbar` and pins with the header as one unit; only the page title and the `Next` card scroll away. Its `-mt-[2.5dvw] pt-[2.5dvw]` pair is an opaque band, not spacing — it stops rows appearing above the pinned header at the shell's own top inset while adding no height in normal flow. `sticky={false}` exists only for the style guide, outside the shell whose inset the band assumes.
- **Row height is the density context** (`components/dashboard/tableDensity.ts`), vertical padding only: horizontal padding would move the scroll threshold per mode. The cookie pair mirrors the sidebar's exactly and is read server-side by both route pages, so the first paint is already right. The `DensityMenu` trigger only exists on `/dashboard` because connections has no toolbar, but the value applies to both tables — it belongs in Settings once that exists.
- Overlays are safe inside the scroll wrapper: `DropdownMenuContent` and `TooltipContent` both portal.
