# Component Map

## Component Structure

```
components/
  ui/                     ← shared shadcn primitives, restyled onto the tokens
  styleGuide/             ← the admin style guide page (see Design System)
  Workspace.tsx           ← root canvas component; owns CanvasState ref, tool state, pan/zoom
    ├─ BoardHeader.tsx    ← host identity + inline-editable workspace title
    ├─ Toolbar.tsx        ← left toolbar (tools, colour fans via ToolbarButton/ColourSelector,
    │                       undo/redo, and the hidden image/PDF input behind Add image)
    ├─ ParticipantRoster  ← who's in the room (from Presence/others)
    ├─ CursorLayer.tsx    ← renders other users' cursors from Presence
    ├─ SelectionActions   ← delete button pinned under the selection box; the
    │                       only route to delete without a keyboard
    └─ FullscreenLoader   ← shown until the room's first init completes
  ConnectionNotice        ← held-open toast while the socket is down; strokes
                            keep committing locally behind it
  dashboard/
    DashboardClient.tsx   ← data fetching, filter state, role gating
      └─ DashboardShell   ← Sidebar (md+) / Navbar + TabBar swap, and the content column
           ├─ Sidebar.tsx      ← identity, Menu, then a one-button Actions section (see Dashboard
           │                     Actions below); mounts whichever modal that action needs
           ├─ Next.tsx         ← the next upcoming lesson
           ├─ Filters.tsx      ← the collaborator popover on its own; the bar it
           │                     sits in is WorkspaceControls (tabs, search,
           │                     clear, DensityMenu), rendered twice — once for
           │                     the mobile list, once as DataTable's toolbar
           ├─ WorkspaceLists   ← upcoming/past tabs
           │    └─ WorkspaceTable + WorkspaceTableRow (+ RowActionsMenu, PeopleStack)
           ├─ DataTable.tsx    ← the one table shell (see Data Table below), with
           │                     DataTableRow; used by both tables and both skeletons
           ├─ WorkspaceModal   ← create/edit, steps in workspaceModalSteps/
           ├─ mobile/          ← the sub-md surface: TabBar (bottom nav + a floating button
           │                     carrying the same one action), WorkspaceList/WorkspaceRow
           │                     + WorkspaceDetailSheet, ConnectionsList/ConnectionRow,
           │                     FiltersSheet
           ├─ connections/     ← app/dashboard/connections: ConnectionsClient, ConnectionsTable +
           │                     ConnectionRow, LinkCodeDialog (generate/redeem tabs), InviteCountdown
           └─ skeletons/       ← loading states mirroring the real layouts, mobile and desktop
  home/                   ← Navbar (shared with dashboard/legal), hero CTAs
  policy/PolicyDocument   ← renders data/policies/*.json
  changelog/ChangelogDocument ← renders data/changelog.json
  inlineMarkup.tsx        ← the [label](url) / **bold** / {{CONTACT_EMAIL}} pass
                            both of the above share
```

Keyboard shortcuts (undo/redo, delete selection, etc.) live in `hooks/useKeybinds.tsx`.
