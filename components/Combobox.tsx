"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type TimeFilter = "upcoming" | "passed" | "next" | null;

const OPTIONS: { label: string; value: TimeFilter }[] = [
    { label: "All workspaces", value: null },
    { label: "Next", value: "next" },
    { label: "Upcoming", value: "upcoming" },
    { label: "Previous", value: "passed" },
];

interface ComboboxProps {
    value: TimeFilter;
    onChange: (value: TimeFilter) => void;
    className?: string;
}

const Combobox = ({ value, onChange, className }: ComboboxProps) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const selected = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((prev) => !prev)}
                className={cn(
                    "flex items-center gap-1.5 text-foreground rounded-full cursor-pointer border-2 border-white/15 px-3 py-1 text-xs",
                    className,
                )}
            >
                <span>{selected.label}</span>
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    className={cn(
                        "transition-transform duration-150 shrink-0",
                        open && "rotate-180",
                    )}
                >
                    <path
                        d="M2 4l4 4 4-4"
                        stroke="currentColor"
                        strokeOpacity={0.5}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>

            {open && (
                <div className="absolute top-[calc(100%+6px)] left-0 z-10 min-w-40 overflow-hidden rounded-md border border-white/5 bg-[#0d0d0a]">
                    {OPTIONS.map((option) => (
                        <button
                            key={String(option.value)}
                            onClick={() => {
                                onChange(option.value);
                                setOpen(false);
                            }}
                            className={cn(
                                "block w-full cursor-pointer px-3.5 py-2 text-left text-xs transition-colors",
                                option.value === value
                                    ? "bg-[#0f348b]/30 text-foreground"
                                    : "text-foreground/60 hover:bg-white/5",
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Combobox;
