"use client";

import React, { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

type TooltipProps = {
    label: string;
    children: ReactNode;
    className?: string;
};

const Tooltip = ({ label, children, className }: TooltipProps) => {
    const [hovered, setHovered] = useState(false);
    const [cursor, setCursor] = useState({ x: 0, y: 0 });

    return (
        <div
            className={cn("relative", hovered && "z-30", className)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setCursor({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                });
            }}
        >
            <div
                className={`pointer-events-none absolute z-20 bg-foreground text-background text-caption font-inter-regular px-2 py-1 rounded-sm whitespace-nowrap shadow-md transition-opacity duration-150 ${
                    hovered ? "opacity-100" : "opacity-0"
                }`}
                style={{ left: cursor.x + 14, top: cursor.y + 14 }}
            >
                {label}
            </div>
            {children}
        </div>
    );
};

export default Tooltip;
