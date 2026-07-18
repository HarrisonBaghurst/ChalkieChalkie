"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type RowActionsMenuProps = {
    onJoin: () => void;
    onEdit?: () => void;
};

// Trailing three-dot menu for a table row. Holds the row's actions (Join
// always, Edit only when a handler is supplied, i.e. the host). Stops click
// propagation so opening the menu never triggers the row's join-on-click.
const RowActionsMenu = ({ onJoin, onEdit }: RowActionsMenuProps) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, []);

    const runAction = (action: () => void) => (e: React.MouseEvent) => {
        e.stopPropagation();
        setOpen(false);
        action();
    };

    return (
        <div ref={ref} className="relative flex justify-end">
            <button
                type="button"
                aria-label="Row actions"
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((p) => !p);
                }}
                className="flex h-8 w-8 items-center justify-center radius-control text-foreground-third hover:bg-foreground-third/20 hover:text-foreground-second cursor-pointer"
            >
                <span className="flex flex-col gap-0.5">
                    <span className="h-1 w-1 rounded-full bg-current" />
                    <span className="h-1 w-1 rounded-full bg-current" />
                    <span className="h-1 w-1 rounded-full bg-current" />
                </span>
            </button>

            {open && (
                <div className="absolute top-[calc(100%+6px)] right-0 z-20 w-40 overflow-hidden radius-control border border-white/10 bg-[#0d0d0a]">
                    <button
                        type="button"
                        onClick={runAction(onJoin)}
                        className="flex w-full items-center px-3 py-2 text-left text-small hover:bg-white/5 cursor-pointer"
                    >
                        Join workspace
                    </button>
                    {onEdit && (
                        <button
                            type="button"
                            onClick={runAction(onEdit)}
                            className={cn(
                                "flex w-full items-center px-3 py-2 text-left text-small hover:bg-white/5 cursor-pointer",
                            )}
                        >
                            Edit workspace
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default RowActionsMenu;
