"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useConnectionState } from "@/hooks/realtime/hooks";

const TOAST_ID = "realtime-connection";

const ConnectionNotice = () => {
    const { offline } = useConnectionState();
    const wasOffline = useRef(false);

    useEffect(() => {
        if (offline) {
            wasOffline.current = true;
            toast.warning("Reconnecting… your work is saved locally.", {
                id: TOAST_ID,
                duration: Infinity,
            });
            return;
        }

        if (wasOffline.current) {
            wasOffline.current = false;
            toast.success("Reconnected.", { id: TOAST_ID, duration: 2000 });
        }
    }, [offline]);

    return null;
};

export default ConnectionNotice;
