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
