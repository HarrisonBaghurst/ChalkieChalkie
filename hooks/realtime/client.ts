import { PastedImageMeta } from "@/types/imageTypes";
import { Stroke } from "@/types/strokeTypes";
import {
    ClientMessage,
    EMPTY_PRESENCE,
    Op,
    PeerState,
    Presence,
    REALTIME_SUBPROTOCOL,
    ServerMessage,
    UserInfo,
} from "@/types/realtimeTypes";

const CURSOR_FLUSH_MS = 250;
const KEEPALIVE_MS = 30_000;
const RECONNECT_MIN_MS = 250;
const RECONNECT_MAX_MS = 8_000;
const OFFLINE_NOTICE_MS = 3_000;
const HISTORY_DEPTH = 100;

export type Peer = {
    connectionId: number;
    id: string;
    info: UserInfo;
    presence: Presence;
};

export type Self = { connectionId: number; id: string; info: UserInfo };

export type ConnectionStatus = "connecting" | "connected" | "reconnecting";

type Listener = () => void;

type Snapshot = {
    strokes: readonly Stroke[] | null;
    images: readonly PastedImageMeta[] | null;
    peers: readonly Peer[];
    self: Self | null;
    status: ConnectionStatus;
    offline: boolean;
};

const replaceById = <T extends { id: string }>(
    list: readonly T[],
    next: T,
): readonly T[] => {
    const index = list.findIndex((item) => item.id === next.id);
    if (index === -1) return [...list, next];
    // Same identity when nothing moved, so an echo of our own op does not
    // restart the render loop's [strokes] effect.
    if (JSON.stringify(list[index]) === JSON.stringify(next)) return list;
    const copy = list.slice();
    copy[index] = next;
    return copy;
};

const mergeById = <T extends { id: string }>(
    list: readonly T[],
    id: string,
    changes: Partial<T>,
): readonly T[] => {
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return list;
    const merged = { ...list[index], ...changes };
    if (JSON.stringify(list[index]) === JSON.stringify(merged)) return list;
    const copy = list.slice();
    copy[index] = merged;
    return copy;
};

const removeByIds = <T extends { id: string }>(
    list: readonly T[],
    ids: string[],
): readonly T[] => {
    const doomed = new Set(ids);
    const next = list.filter((item) => !doomed.has(item.id));
    return next.length === list.length ? list : next;
};

export class RealtimeRoom {
    private socket: WebSocket | null = null;
    private listeners = new Set<Listener>();
    private closed = false;
    private attempt = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private keepaliveTimer: ReturnType<typeof setInterval> | null = null;
    private offlineTimer: ReturnType<typeof setTimeout> | null = null;

    private strokes: readonly Stroke[] | null = null;
    private images: readonly PastedImageMeta[] | null = null;
    private peers: readonly Peer[] = [];
    private self: Self | null = null;
    private status: ConnectionStatus = "connecting";
    private offline = false;
    private snapshot: Snapshot;

    private loadingStrokes: Stroke[] = [];
    private loadingImages: PastedImageMeta[] = [];

    // Ops raised while the socket is down. Flushed before the re-init, so the
    // server has applied them by the time it replies and both sides converge.
    private queue: Op[] = [];

    private undoStack: Op[] = [];
    private redoStack: Op[] = [];

    private presence: Presence = { ...EMPTY_PRESENCE };
    private pendingPresence: Partial<Presence> | null = null;
    private cursorFlushTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(
        private roomId: string,
        private onAuthFailure: (status: number) => void,
    ) {
        this.snapshot = this.buildSnapshot();
        this.connect();
    }

    subscribe = (listener: Listener) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    getSnapshot = (): Snapshot => this.snapshot;

    private buildSnapshot(): Snapshot {
        return {
            strokes: this.strokes,
            images: this.images,
            peers: this.peers,
            self: this.self,
            status: this.status,
            offline: this.offline,
        };
    }

    private emit() {
        this.snapshot = this.buildSnapshot();
        for (const listener of this.listeners) listener();
    }

    private async connect() {
        if (this.closed) return;

        let ticket: string;
        try {
            const response = await fetch("/api/realtime-auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ room: this.roomId }),
            });
            if (!response.ok) {
                this.onAuthFailure(response.status);
                if (response.status === 403 || response.status === 401) return;
                this.scheduleReconnect();
                return;
            }
            ({ ticket } = await response.json());
        } catch {
            this.scheduleReconnect();
            return;
        }

        if (this.closed) return;

        const base = process.env.NEXT_PUBLIC_REALTIME_URL!;
        const socket = new WebSocket(`${base}/room/${this.roomId}/ws`, [
            REALTIME_SUBPROTOCOL,
            ticket,
        ]);
        this.socket = socket;

        socket.onopen = () => {
            this.attempt = 0;
            this.status = "connected";
            this.clearOfflineTimer();
            this.offline = false;

            for (const op of this.queue.splice(0)) {
                this.rawSend({ t: "op", op });
            }
            if (this.presence.cursor || this.presence.selection) {
                this.rawSend({ t: "presence", patch: this.presence });
            }

            this.keepaliveTimer = setInterval(() => {
                if (socket.readyState === WebSocket.OPEN) socket.send("ping");
            }, KEEPALIVE_MS);

            this.emit();
        };

        socket.onmessage = (event) => {
            if (typeof event.data !== "string" || event.data === "pong") return;
            this.receive(JSON.parse(event.data) as ServerMessage);
        };

        socket.onclose = () => {
            this.stopKeepalive();
            if (this.socket === socket) this.socket = null;
            this.scheduleReconnect();
        };

        socket.onerror = () => socket.close();
    }

    private receive(message: ServerMessage) {
        switch (message.t) {
            case "init-begin":
                this.loadingStrokes = [];
                this.loadingImages = [];
                this.self = {
                    connectionId: message.connectionId,
                    id: message.userId,
                    info: message.info,
                };
                return;

            case "init-chunk":
                this.loadingStrokes.push(...message.strokes);
                this.loadingImages.push(...message.images);
                return;

            case "init-end":
                this.strokes = this.loadingStrokes;
                this.images = this.loadingImages;
                this.loadingStrokes = [];
                this.loadingImages = [];
                this.peers = message.others.map((peer) => this.toPeer(peer));
                this.emit();
                return;

            case "op":
                this.applyOp(message.op);
                this.emit();
                return;

            case "presence": {
                let changed = false;
                this.peers = this.peers.map((peer) => {
                    if (peer.connectionId !== message.from) return peer;
                    changed = true;
                    return {
                        ...peer,
                        presence: { ...peer.presence, ...message.patch },
                    };
                });
                if (changed) this.emit();
                return;
            }

            case "join":
                this.peers = [...this.peers, this.toPeer(message.peer)];
                this.emit();
                return;

            case "leave":
                this.peers = this.peers.filter(
                    (peer) => peer.connectionId !== message.connectionId,
                );
                this.emit();
                return;

            case "resync-presence":
                // The room woke from hibernation and lost every peer's presence.
                // useSelectionPresence dedupes on a signature and will never
                // resend on its own, which is why the cache lives here.
                this.rawSend({ t: "presence", patch: this.presence });
                return;
        }
    }

    private toPeer(peer: PeerState): Peer {
        return {
            connectionId: peer.connectionId,
            id: peer.userId,
            info: peer.info,
            presence: peer.presence ?? { ...EMPTY_PRESENCE },
        };
    }

    private applyOp(op: Op) {
        switch (op.t) {
            case "addStroke":
                if (this.strokes)
                    this.strokes = replaceById(this.strokes, op.stroke);
                return;

            case "eraseStrokes":
                if (this.strokes)
                    this.strokes = removeByIds(this.strokes, op.ids);
                return;

            case "restoreStrokes":
                if (this.strokes) {
                    let next = this.strokes;
                    for (const stroke of op.strokes)
                        next = replaceById(next, stroke);
                    this.strokes = next;
                }
                return;

            case "addImage":
                if (this.images)
                    this.images = replaceById(this.images, op.meta);
                return;

            case "removeImage":
                if (this.images)
                    this.images = removeByIds(this.images, [op.id]);
                return;

            case "updateImage":
                if (this.images)
                    this.images = mergeById(this.images, op.id, op.changes);
                return;

            case "moveStrokes":
                if (this.strokes) {
                    let next = this.strokes;
                    for (const move of op.moves) {
                        next = mergeById(next, move.id, {
                            points: move.points,
                        });
                    }
                    this.strokes = next;
                }
                return;
        }
    }

    // Applied locally first: a pen stroke has to appear the instant pen.ts
    // clears currentStroke, or it blinks out for a round trip.
    send(op: Op) {
        this.applyOp(op);
        this.emit();
        if (!this.rawSend({ t: "op", op })) this.queue.push(op);
    }

    // The inverse is captured before the op lands, so it describes the state
    // being replaced rather than the one being written.
    commit(op: Op) {
        const inverse = this.inverseOf(op);
        if (inverse) {
            this.undoStack.push(inverse);
            if (this.undoStack.length > HISTORY_DEPTH) this.undoStack.shift();
            this.redoStack.length = 0;
        }
        this.send(op);
    }

    undo = () => {
        const inverse = this.undoStack.pop();
        if (!inverse) return;
        const redo = this.inverseOf(inverse);
        if (redo) this.redoStack.push(redo);
        this.send(inverse);
    };

    redo = () => {
        const op = this.redoStack.pop();
        if (!op) return;
        const inverse = this.inverseOf(op);
        if (inverse) this.undoStack.push(inverse);
        this.send(op);
    };

    private inverseOf(op: Op): Op | null {
        switch (op.t) {
            case "addStroke":
                return { t: "eraseStrokes", ids: [op.stroke.id] };

            case "eraseStrokes": {
                const doomed = new Set(op.ids);
                const strokes = (this.strokes ?? []).filter((s) =>
                    doomed.has(s.id),
                );
                return strokes.length > 0
                    ? { t: "restoreStrokes", strokes }
                    : null;
            }

            case "restoreStrokes":
                return {
                    t: "eraseStrokes",
                    ids: op.strokes.map((s) => s.id),
                };

            case "addImage":
                return { t: "removeImage", id: op.meta.id };

            case "removeImage": {
                const meta = (this.images ?? []).find((i) => i.id === op.id);
                return meta ? { t: "addImage", meta } : null;
            }

            case "updateImage": {
                const meta = (this.images ?? []).find((i) => i.id === op.id);
                if (!meta) return null;
                const changes: Partial<PastedImageMeta> = {};
                for (const key of Object.keys(
                    op.changes,
                ) as (keyof PastedImageMeta)[]) {
                    Object.assign(changes, { [key]: meta[key] });
                }
                return { t: "updateImage", id: op.id, changes };
            }

            case "moveStrokes": {
                const moves = op.moves.flatMap((move) => {
                    const stroke = (this.strokes ?? []).find(
                        (s) => s.id === move.id,
                    );
                    return stroke
                        ? [{ id: move.id, points: stroke.points }]
                        : [];
                });
                return moves.length > 0 ? { t: "moveStrokes", moves } : null;
            }
        }
    }

    updatePresence(patch: Partial<Presence>) {
        this.presence = { ...this.presence, ...patch };
        this.pendingPresence = { ...(this.pendingPresence ?? {}), ...patch };

        // Selection drives the remote locks, so it goes out immediately. Cursor
        // is the only high-volume field and the only one worth coalescing.
        const carriesSelection = "selection" in patch;
        const cursorOnly = "cursor" in patch && !carriesSelection;
        if (!cursorOnly) {
            this.flushPresence();
            return;
        }

        if (this.cursorFlushTimer) return;
        this.cursorFlushTimer = setTimeout(() => {
            this.cursorFlushTimer = null;
            this.flushPresence();
        }, CURSOR_FLUSH_MS);
    }

    private flushPresence() {
        if (this.cursorFlushTimer) {
            clearTimeout(this.cursorFlushTimer);
            this.cursorFlushTimer = null;
        }
        const patch = this.pendingPresence;
        this.pendingPresence = null;
        if (patch) this.rawSend({ t: "presence", patch });
    }

    private rawSend(message: ClientMessage): boolean {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return false;
        }
        this.socket.send(JSON.stringify(message));
        return true;
    }

    private scheduleReconnect() {
        if (this.closed || this.reconnectTimer) return;

        this.status = "reconnecting";
        if (!this.offlineTimer && !this.offline) {
            this.offlineTimer = setTimeout(() => {
                this.offline = true;
                this.emit();
            }, OFFLINE_NOTICE_MS);
        }
        this.emit();

        const delay = Math.min(
            RECONNECT_MAX_MS,
            RECONNECT_MIN_MS * 2 ** this.attempt++,
        );
        this.reconnectTimer = setTimeout(
            () => {
                this.reconnectTimer = null;
                this.connect();
            },
            delay + Math.random() * 250,
        );
    }

    private stopKeepalive() {
        if (this.keepaliveTimer) clearInterval(this.keepaliveTimer);
        this.keepaliveTimer = null;
    }

    private clearOfflineTimer() {
        if (this.offlineTimer) clearTimeout(this.offlineTimer);
        this.offlineTimer = null;
    }

    destroy() {
        this.closed = true;
        this.stopKeepalive();
        this.clearOfflineTimer();
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        if (this.cursorFlushTimer) clearTimeout(this.cursorFlushTimer);
        this.socket?.close();
        this.socket = null;
        this.listeners.clear();
    }
}
