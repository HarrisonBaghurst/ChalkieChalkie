"use client";

import { ReactNode } from "react";
import { RoomProvider } from "@/hooks/realtime/RoomProvider";
import ConnectionNotice from "@/components/ConnectionNotice";

export function Room({
    children,
    boardId,
}: {
    children: ReactNode;
    boardId: string;
}) {
    return (
        <RoomProvider roomId={boardId}>
            <ConnectionNotice />
            {children}
        </RoomProvider>
    );
}
