"use client";

import React, { useRef, useState } from "react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

type TapTooltipProps = {
    content: React.ReactNode;
    children: React.ReactElement;
};

// A plain Radix tooltip opens on hover and focus only, so its content is
// unreachable on a touch screen — which the dashboard table now reaches, since
// a landscape tablet clears lg. Pointer type is read per interaction rather
// than from a media query, so a hybrid laptop gets both behaviours and nothing
// depends on client-only state at hydration.
const TapTooltip = ({ content, children }: TapTooltipProps) => {
    const [open, setOpen] = useState(false);
    const pointerType = useRef("mouse");
    const openAtPointerDown = useRef(false);

    return (
        <Tooltip
            open={open}
            onOpenChange={setOpen}
        >
            <TooltipTrigger
                asChild
                onPointerDown={(e) => {
                    pointerType.current = e.pointerType;
                    // Both Radix's trigger and the content's dismissable layer
                    // close on pointerdown, so by the time the tap resolves the
                    // tooltip is already shut. Toggle off what it was before.
                    openAtPointerDown.current = open;
                }}
                // Not onClick: iOS only dispatches click to a delegated
                // listener when the target is interactive, which the truncated
                // <span> triggers are not. A cancelled pointer (a scroll begun
                // on the trigger) never reaches pointerup, so this ignores
                // those for free.
                onPointerUp={(e) => {
                    if (e.pointerType === "mouse") return;
                    setOpen(!openAtPointerDown.current);
                }}
                onClick={(e) => {
                    if (pointerType.current === "mouse" || e.detail === 0) {
                        return;
                    }
                    // Radix composes its own close-on-click after ours and skips
                    // it once the event is defaultPrevented.
                    e.preventDefault();
                }}
            >
                {children}
            </TooltipTrigger>
            <TooltipContent>{content}</TooltipContent>
        </Tooltip>
    );
};

export default TapTooltip;
