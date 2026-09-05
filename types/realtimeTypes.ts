import { PastedImageMeta } from "@/types/imageTypes";
import { SelectionPresence } from "@/types/presenceTypes";
import { Point, Stroke } from "@/types/strokeTypes";

export const REALTIME_SUBPROTOCOL = "chalkie.v1";

export type UserInfo = {
    firstName: string;
    lastName: string;
    imageUrl: string;
    email: string;
};

export type TicketClaims = {
    sub: string;
    room: string;
    info: UserInfo;
    iat: number;
    exp: number;
};

export type Presence = {
    cursor: Point | null;
    selection: SelectionPresence | null;
};

export type Op =
    | { t: "addStroke"; stroke: Stroke }
    | { t: "eraseStrokes"; ids: string[] }
    | { t: "restoreStrokes"; strokes: Stroke[] }
    | { t: "addImage"; meta: PastedImageMeta }
    | { t: "removeImage"; id: string }
    | { t: "updateImage"; id: string; changes: Partial<PastedImageMeta> }
    | { t: "moveStrokes"; moves: { id: string; points: Point[] }[] };

export type ClientMessage =
    | { t: "op"; op: Op }
    | { t: "presence"; patch: Partial<Presence> };

export type PeerState = {
    connectionId: number;
    userId: string;
    info: UserInfo;
    presence: Presence;
};

export type ServerMessage =
    | { t: "init-begin"; connectionId: number; userId: string; info: UserInfo }
    | { t: "init-chunk"; strokes: Stroke[]; images: PastedImageMeta[] }
    | { t: "init-end"; others: PeerState[] }
    | { t: "op"; op: Op; from: number }
    | { t: "presence"; from: number; patch: Partial<Presence> }
    | { t: "join"; peer: PeerState }
    | { t: "leave"; connectionId: number }
    | { t: "resync-presence" };

export const EMPTY_PRESENCE: Presence = { cursor: null, selection: null };
