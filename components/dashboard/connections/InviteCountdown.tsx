"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/textUtils";
import { cn } from "@/lib/utils";

type InviteCountdownProps = {
    expiresAt: string;
    onExpire?: () => void;
};

// Render with `key={invite.code}`: the initial time is computed once in the
// lazy initializer, so a new code needs a fresh mount rather than an effect
// that resets state and costs an extra render.
const InviteCountdown = ({ expiresAt, onExpire }: InviteCountdownProps) => {
    const [remainingMs, setRemainingMs] = useState(
        () => new Date(expiresAt).getTime() - Date.now(),
    );

    useEffect(() => {
        const interval = setInterval(() => {
            setRemainingMs((prev) => {
                const next = new Date(expiresAt).getTime() - Date.now();
                if (next <= 0 && prev > 0) onExpire?.();
                return next;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [expiresAt, onExpire]);

    const isExpired = remainingMs <= 0;

    return (
        // Time-derived, so the server value can legitimately differ from the
        // client's on hydration.
        <span
            suppressHydrationWarning
            className={cn(
                "font-inter-bold tabular-nums",
                isExpired
                    ? "text-foreground-third"
                    : remainingMs <= 60_000
                      ? "text-destructive"
                      : "text-foreground-second",
            )}
        >
            {isExpired ? "Expired" : formatCountdown(remainingMs)}
        </span>
    );
};

export default InviteCountdown;
