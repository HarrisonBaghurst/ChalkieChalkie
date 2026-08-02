"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/textUtils";
import { cn } from "@/lib/utils";

type InviteCountdownProps = {
    expiresAt: string;
    onExpire?: () => void;
};

// mm:ss ticker for a live invite code. Switches to text-destructive under a
// minute remaining so an about-to-expire code reads differently, and fires
// onExpire the instant it crosses zero so the parent can drop the stale code.
//
// Render this with `key={invite.code}` at the call site: the initial
// remaining time is computed once from useState's lazy initializer, so a new
// code (regenerate, or a refetched invite) needs a fresh mount rather than a
// reset inside this effect — resetting state synchronously from an effect
// body causes an extra render on every prop change.
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
        // suppressHydrationWarning: this text is genuinely time-derived (see
        // the lazy useState initializer above), so a server-rendered value can
        // legitimately differ from the client's by a second or two on
        // hydration — the exact case React's own docs call out this prop for.
        // In the real app this only ever mounts client-side (inside a Dialog
        // opened after user interaction); it's the /style-guide specimen that
        // exercises the SSR path.
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
