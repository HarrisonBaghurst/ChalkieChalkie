"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type TabItem = {
    id: string;
    label: string;
    // Optional count badge rendered next to the label (like the reference UI).
    count?: number;
};

type TabsProps = {
    tabs: TabItem[];
    activeId: string;
    onChange: (id: string) => void;
    className?: string;
};

// General-purpose segmented tab bar. Purely presentational + controlled: the
// caller owns the active id and decides what each tab shows.
const Tabs = ({ tabs, activeId, onChange, className }: TabsProps) => {
    return (
        <div
            className={cn(
                "inline-flex items-center gap-1 radius-tag border border-foreground-third/25 bg-card-background p-1",
                className,
            )}
        >
            {tabs.map((tab) => {
                const active = tab.id === activeId;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onChange(tab.id)}
                        className={cn(
                            "flex items-center gap-2 radius-tag px-3 py-1.5 text-small cursor-pointer transition-colors",
                            active
                                ? "bg-foreground-third/30 text-foreground"
                                : "text-foreground-third hover:text-foreground-second",
                        )}
                    >
                        <span>{tab.label}</span>
                        {tab.count !== undefined && (
                            <span
                                className={cn(
                                    "rounded-full px-1.5 text-caption",
                                    active
                                        ? "bg-foreground-third/40 text-foreground-second"
                                        : "bg-foreground-third/20 text-foreground-third",
                                )}
                            >
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default Tabs;
