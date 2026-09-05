"use client";

import { useCallback } from "react";
import { Presence } from "@/types/realtimeTypes";
import { Peer, Self } from "./client";
import { useRoom, useRoomSnapshot } from "./RoomProvider";

export const useOthers = (): readonly Peer[] => useRoomSnapshot().peers;

export const useSelf = (): Self | null => useRoomSnapshot().self;

export const useUpdateMyPresence = (): ((patch: Partial<Presence>) => void) => {
    const room = useRoom();
    return useCallback(
        (patch: Partial<Presence>) => {
            room.updatePresence(patch);
        },
        [room],
    );
};

export const useHistory = (): { undo: () => void; redo: () => void } => {
    const room = useRoom();
    return { undo: room.undo, redo: room.redo };
};

export const useConnectionState = () => {
    const { status, offline } = useRoomSnapshot();
    return { status, offline };
};
