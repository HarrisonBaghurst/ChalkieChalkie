"use client";

import {
    ReactNode,
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import FullscreenLoader from "@/components/FullscreenLoader";
import { RealtimeRoom } from "./client";

const RoomContext = createContext<RealtimeRoom | null>(null);

export const useRoom = (): RealtimeRoom => {
    const room = useContext(RoomContext);
    if (!room) throw new Error("useRoom must be used inside a RoomProvider");
    return room;
};

export const useRoomSnapshot = () => {
    const room = useRoom();
    return useSyncExternalStore(
        room.subscribe,
        room.getSnapshot,
        room.getSnapshot,
    );
};

export function RoomProvider({
    roomId,
    children,
}: {
    roomId: string;
    children: ReactNode;
}) {
    const router = useRouter();
    const routerRef = useRef(router);
    useEffect(() => {
        routerRef.current = router;
    }, [router]);

    const [room, setRoom] = useState<RealtimeRoom | null>(null);

    useEffect(() => {
        const instance = new RealtimeRoom(roomId, (status) => {
            if (status === 403) {
                routerRef.current.push("/forbidden");
                return;
            }
            toast.error("Authentication failed.");
        });
        setRoom(instance);
        return () => instance.destroy();
    }, [roomId]);

    if (!room) return <FullscreenLoader />;

    return <RoomContext.Provider value={room}>{children}</RoomContext.Provider>;
}
