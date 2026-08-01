"use client";

import React from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type RowActionsMenuProps = {
    onJoin: () => void;
    onEdit?: () => void;
};

// Trailing three-dot menu for a table row. Holds the row's actions (Join
// always, Edit only when a handler is supplied, i.e. the host). Stops click
// propagation so opening the menu never triggers the row's join-on-click.
const RowActionsMenu = ({ onJoin, onEdit }: RowActionsMenuProps) => {
    const runAction = (action: () => void) => (e: React.MouseEvent) => {
        e.stopPropagation();
        action();
    };

    return (
        <div className="flex justify-end">
            <DropdownMenu>
                <DropdownMenuTrigger
                    aria-label="Row actions"
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center radius-control text-foreground-third outline-none hover:bg-foreground-third/20 hover:text-foreground-second focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                    <span className="flex flex-col gap-0.5">
                        <span className="h-1 w-1 rounded-full bg-current" />
                        <span className="h-1 w-1 rounded-full bg-current" />
                        <span className="h-1 w-1 rounded-full bg-current" />
                    </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    className="w-40"
                    onClick={(e) => e.stopPropagation()}
                >
                    <DropdownMenuItem onClick={runAction(onJoin)}>
                        Join workspace
                    </DropdownMenuItem>
                    {onEdit && (
                        <DropdownMenuItem onClick={runAction(onEdit)}>
                            Edit workspace
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

export default RowActionsMenu;
