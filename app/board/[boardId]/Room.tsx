"use client";

import { ReactNode } from "react";
import {
    LiveblocksProvider,
    RoomProvider,
    ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { LiveList } from "@liveblocks/client";
import FullscreenLoader from "@/components/FullscreenLoader";
import { useRouter } from "next/navigation";

export function Room({
    children,
    boardId,
}: {
    children: ReactNode;
    boardId: string;
}) {
    const router = useRouter();
    return (
        <LiveblocksProvider
            authEndpoint={async (room) => {
                const response = await fetch("/api/liveblocks-auth", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ room }),
                });

                if (response.status === 403) {
                    router.push("/forbidden");
                    return new Promise(() => {});
                }

                if (!response.ok) {
                    throw new Error(`Auth failed: ${response.status}`);
                }

                return response.json();
            }}
        >
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
