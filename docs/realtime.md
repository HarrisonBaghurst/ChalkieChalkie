# Realtime Sync

## Real-Time Data Model (Cloudflare Durable Objects)

The Worker is a **separate npm project** with its own `package.json`, `tsconfig.json` and `node_modules`. It is excluded from the root `tsconfig.json` and from `eslint.config.mjs`, because Cloudflare's globals and the Next/React rules do not apply to each other — so `npm run build` at the root will not catch a Worker error. Run its typecheck separately with `cd realtime && npm run typecheck`.

Sync runs on a Cloudflare Worker in `realtime/`, deployed separately with `wrangler`. One `BoardRoom` Durable Object per room id, addressed by `idFromName(roomId)` — created on first connect, exactly as the Liveblocks room it replaced was. The Supabase `Room` row stays the authoritative record.

**The class is exported as `BoardRoomV2`** while the source class keeps its own name. Migration `v3` deleted the original namespace outright, which was the only way to reach the objects the constructor-migrate bug had made permanent: their rooms were long gone from Supabase, and `idFromName` is one-way, so nothing could address them by name. A delete migration is illegal while any code or binding still references the class, so the replacement could not reuse the name — hence `v2` provisions `BoardRoomV2` alongside `v3`'s delete, in one deploy, so no request ever finds no namespace. Applied tags cannot be removed or edited, so the array only ever grows; another wipe would need `v4` provisioning `BoardRoomV3` beside `v5` deleting `BoardRoomV2`. The binding stays `BOARD_ROOM`, which is why no application code knows any of this happened.
The protocol is defined once in `types/realtimeTypes.ts` and imported by both sides (`realtime/tsconfig.json` maps `@/*` to the repo root). Two flat record lists, not a CRDT:

```ts
Storage (DO SQLite): strokes, images     // id PK, seq, body JSON, deleted flag
Presence (DO memory): { cursor, selection }
Identity: { connectionId, userId, info } // in ws.serializeAttachment
```

Seven ops (`types/realtimeTypes.ts`) map 1:1 onto the six mutations in `hooks/useLiveWorkspace.tsx`, plus `restoreStrokes`, which only undo uses. Never send an op from a component; go through `useLiveWorkspace`.

- **`seq` is paint order** — it reproduces the old `LiveList` insertion order, and reads are `WHERE deleted = 0 ORDER BY seq`. `updateImage` and `moveStrokes` deliberately never touch it, matching the `LiveList.set` they replaced.
- **Deletes are soft, and that is what makes undo work.** A hard delete loses `seq`, so an undone erase would come back on top of the stack instead of in its original layer — visible for highlighters and images. Tombstones are cleared when a room is opened with no other connection (nobody can hold an undo stack for it), capped at 2000 as a backstop.
- **The `seq` counter is derived from `SELECT MAX(seq)` on wake, never persisted.** A counter row per insert would roughly double rows-written, which is the first billing limit to bind.
- **The schema is created lazily and the teardown path must leave it gone.** A Durable Object ceases to exist only if its storage is empty when it shuts down, so `migrate()` runs from `ensureSchema()` on the first connect — never in the constructor, and never after `ctx.storage.deleteAll()`. Both of those were true once and both leaked: re-migrating after `deleteAll` made every deleted room's DO permanent, and migrating in the constructor meant the admin `DELETE` for a workspace that was _never opened_ conjured a Durable Object purely in order to delete it. Nothing bills much per empty room, but neither leak has a ceiling. `ensureSchema()` is called from `sendInit` and `applyOp`, which is every path that touches SQL; the "no such table" 500 it also prevents is a side effect, not the reason.
- **Ops echo back to the sender**, so the DO is the sequencer; the client reducer is "set record by id" and returns the same array identity when nothing changed. Without the echo, two concurrent `updateImage`s leave clients permanently disagreeing; without the identity check, every echo restarts the render loop.
- **Presence is in memory and recovered by resync, never by `serializeAttachment`.** That attachment caps at 16,384 bytes and a marquee over ~450 strokes of UUIDs exceeds it. On a wake from hibernation the DO broadcasts `resync-presence` and each client replays its cached presence — the cache lives in `hooks/realtime/client.ts` because `useSelectionPresence` dedupes on a signature and would never resend on its own.
- **Hibernation is load-bearing for cost**, not an optimisation: `acceptWebSocket` plus `setWebSocketAutoResponse` for ping/pong means an idle room accrues no duration charge. A plain `server.accept()` would pin it in memory and bill continuously.

Presence types are still **type aliases, not interfaces** (`types/presenceTypes.ts`). The Liveblocks JSON constraint that forced this is gone, but the shapes are shared with the Worker and aliases keep that portable.

## Selection Sharing & Locking

`Presence.selection` doubles as the display of a remote selection and the lock on it. Presence dies with the connection, so a dropped client can never strand items as unselectable.

- **Published** by `hooks/useSelectionPresence.tsx`, which polls the canvas state ref each frame and diffs a signature. Selection is mutated from three places — `pointer.ts`, `onToolChanged` in `Workspace.tsx`, and the Delete branch of `useKeybinds.tsx` — so one watcher on the shared ref beats a `ToolCallbacks` entry every mutation site has to remember to call.
- **Published bounds come off storage** (`strokes`, `pastedImagesMeta`), never off `selectorDelta` or the locally mutated `state.pastedImages`. A drag reaches storage only on pointer-up, so a box that tracked the live gesture would slide away from the strokes it frames and they would snap after it. Frozen at the committed geometry, box and content jump together on commit. The poll is per-frame rather than throttled for the same reason: the bounds change then enters the same socket flush as the storage write that caused it.
- **Consumed** by `hooks/useRemoteSelections.tsx`: fills `CanvasState.lockedStrokeIds` / `lockedImageIds` so tools reach locks through the `ToolContext` they already take, and returns a ref of `{ colour, bounds }` for the render loop (a ref, so a presence tick doesn't restart the rAF loop).
- **Enforced** in `lib/handlers/tools/pointer.ts`: locked images are filtered _out of the hit-test list_, not merely refused, so a locked image on top doesn't become a dead zone over what sits beneath it. The marquee resolution filters locked ids the same way.
- **Drawn** by `drawRemoteSelection` in `lib/canvasDrawing.ts`, last, in the owner's `getUserColour` — tune `REMOTE_SELECTION_LINE_WIDTH` / `REMOTE_SELECTION_RADIUS` there.
- A selecting user's **cursor is replaced by their name pill**, pinned to the box in `CursorLayer.tsx`. The pill deliberately has no CSS transition, unlike the cursor: the box it labels is canvas-drawn without one.
- Simultaneous marquees over the same strokes can both win — the lock is optimistic, not authoritative. Accepted: it is brief, and storage writes are last-write-wins regardless.
