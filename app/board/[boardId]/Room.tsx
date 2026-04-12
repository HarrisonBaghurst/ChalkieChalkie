"use client";

import { ReactNode } from "react";
import {
    LiveblocksProvider,
    RoomProvider,
    ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { LiveList } from "@liveblocks/client";
import FullscreenLoader from "@/components/FullscreenLoader";

export function Room({
    children,
    boardId,
}: {
    children: ReactNode;
    boardId: string;
}) {
    return (
        <LiveblocksProvider authEndpoint={"/api/liveblocks-auth"}>
            <RoomProvider
                id={boardId}
                initialPresence={{ cursor: null }}
                initialStorage={{
                    canvasStrokes: new LiveList([]),
                    pastedImages: new LiveList([]),
                }}
            >
                <ClientSideSuspense fallback={<FullscreenLoader />}>
                    {children}
                </ClientSideSuspense>
            </RoomProvider>
        </LiveblocksProvider>
    );
}
