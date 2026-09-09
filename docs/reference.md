# Types & Shared Helpers

## Key Type Definitions (`types/`)

- `strokeTypes.ts` — `Point`, `Stroke { id, points[], colour, highlight? }`
- `imageTypes.ts` — `PastedImageMeta` (position/size), `PastedImage` (meta + loaded element), `ResizeHandle`
- `toolTypes.ts` — `Tools: "pen" | "eraser" | "pointer" | "highlighter"` + per-tool cursor map. There is no `selector`: the marquee lives inside `pointer`
- `canvasStateTypes.ts` — `CanvasState`, `Viewport`, `ToolContext`, `ToolCallbacks`, `ToolStrategy`
- `presenceTypes.ts` — `SelectionPresence` (the Presence payload), `RemoteSelection` (what the renderer draws)
- `realtimeTypes.ts` — the wire protocol shared with the Worker: `Op`, `ClientMessage`, `ServerMessage`, `Presence`, `TicketClaims`. Keep it free of DOM types; the Worker cannot load the DOM lib alongside `@cloudflare/workers-types`
- `userTypes.ts` — `UserRole`, `userInfo`, `Workspace` (including `opensAt`/`expiresAt`), `WorkspaceEditData`
- `linkTypes.ts` — `LinkRole`, `TutorLinkRow`/`LinkInviteRow` (raw Supabase shapes), `LinkInvite`/`LinkSummary` (client-facing shapes)
- `policyTypes.ts` — `PolicyDocument`/`PolicySection`/`PolicyBlock` for the legal pages, including the supported inline markup
- `changelogTypes.ts` — `ChangelogDocument`/`ChangelogEntry`/`ChangelogChange`/`ChangeTag` for `data/changelog.json`

## Shared Helpers (`lib/`)

Beyond the modules described above: `colours.ts` (pen/highlighter palettes), `userColour.ts` (deterministic per-user identity colour), `textUtils.ts` (relative/countdown/session time formatting), `imageUtils.ts` (image hit-testing and resize handles), `imageLimits.ts` (the storable MIME set and byte cap shared with the images route and matched by the storage bucket, the wider client-only input set, and the PDF page cap), `imagePrepare.ts` (decode, then re-encode every image once into the configured box as JPEG, inverting bright ones), `imageUpload.ts` (the upload/lease-reserve calls and the local-state adopt/rollback steps, shared by the image and PDF insert paths), `r2.ts` (the R2 client and every put/delete/prefix-delete/presign against it — see Image Storage & Serving above), `realtimeTicket.ts` (signs the 60-second websocket ticket — see Access Control above), `realtimeAdmin.ts` (the secret-gated calls into the Worker: room teardown and member eviction — see Access Control above), `pdfLease.ts` (the pre-paid page quota — see Rate Limiting above), `id.ts` (`newId` — client-side ids, see Touch above), `viewport.ts` (zoom clamps, the shared anchor rule, and insert placement/fit), `deleteSelection.ts` (shared by the Delete keybind and the on-canvas button), `dashboardFilters.ts` / `dashboardTableColumns.ts` / `connectionsTableColumns.ts` / `dashboardCounterparty.ts` (dashboard list logic), `tableColumns.ts` (the `TableColumn` shape both column configs are typed against, plus the min-width total and the `<colgroup>` percentages derived from it — see Data Table below), `dashboardActions.ts` (the route × role → single action rule shared by `Sidebar` and `TabBar` — see Dashboard Actions above), `sidebarCookie.ts` / `serverSidebarCookie.ts` (the tri-state sidebar width and its cookie — see Sidebar Collapse above), `tableDensityCookie.ts` / `serverTableDensityCookie.ts` (table row height and its cookie, mirroring the sidebar pair — see Data Table below), `deleteWorkspace.ts` (tears down the Durable Object, R2 images and the Supabase row in a recoverable order), `workspaceLifecycle.ts` (plan limits, the `opens_at`/`expires_at` derivation, the access and lock predicates, and the phase→badge mapping — see Workspace Lifecycle above), `workspaceMapping.ts` (`mapRoomRow`, the one snake→camel `Room` mapping, shared by `DashboardClient` and `WorkspaceModal`), `clerkAppearance.ts` (Clerk theming), `clerkUsers.ts` (`fetchUserProfiles` — the one place Clerk ids get turned into `userInfo`; guards the empty-array-returns-everyone Clerk API footgun), `inviteCode.ts` (invite code alphabet/generation/normalisation), `links.ts` (`tutor_links` queries), `unlinkRooms.ts` (the unlink-cascade helper — see Access Control above), `supabase/admin.ts` (service-role client), `vercelDeployments.ts` (Vercel REST API wrapper for the staged-deployment promotion flow — see Deployment above).

## Path Alias

`@/*` maps to the repo root (configured in `tsconfig.json`).
