"use client";

import React from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type RowAction = {
    label: string;
    onSelect: () => void;
    variant?: "default" | "destructive";
};

type RowActionsMenuProps = {
    actions: RowAction[];
    label?: string;
};

// Stops propagation so opening the menu doesn't fire the row's own onClick.
const RowActionsMenu = ({
    actions,
    label = "Row actions",
}: RowActionsMenuProps) => {
    const runAction = (action: () => void) => (e: React.MouseEvent) => {
        e.stopPropagation();
        action();
    };

    return (
        <div className="flex justify-end">
            <DropdownMenu>
                <DropdownMenuTrigger
                    aria-label={label}
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
                    {actions.map((action) => (
                        <DropdownMenuItem
                            key={action.label}
                            variant={action.variant}
                            onClick={runAction(action.onSelect)}
                        >
                            {action.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

export default RowActionsMenu;
