"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { userInfo } from "@/types/userTypes";
import { cn } from "@/lib/utils";

interface FiltersProps {
    collaborators: userInfo[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
}

const Filters = ({ collaborators, selectedIds, onChange }: FiltersProps) => {
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

    const toggle = (id: string) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter((x) => x !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const disabled = collaborators.length === 0;

    const label = disabled
        ? "No members yet"
        : selectedIds.length === 0
          ? "Members"
          : `${selectedIds.length} member${selectedIds.length === 1 ? "" : "s"} selected`;

    return (
        <div ref={ref} className="relative">
            <button
                disabled={!!disabled}
                suppressHydrationWarning
                onClick={() => setOpen((p) => !p)}
                className={cn(
                    "border border-foreground-third py-2 px-3 rounded-md w-full flex items-center justify-between cursor-pointer text-small",
                    disabled && "cursor-not-allowed text-foreground-third",
                )}
            >
                <span>{label}</span>
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

            {open && !disabled && (
                <div className="absolute top-[calc(100%+6px)] right-0 z-10 w-75 max-h-72 overflow-y-auto rounded-md border border-white/10 bg-[#0d0d0a]">
                    {collaborators.map((collaborator) => {
                        const checked = selectedIds.includes(collaborator.id);
                        return (
                            <button
                                key={collaborator.id}
                                onClick={() => toggle(collaborator.id)}
                                className="flex w-full items-center gap-3 px-3 py-2 text-left text-small hover:bg-white/5 cursor-pointer"
                            >
                                <span
                                    className={cn(
                                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                                        checked
                                            ? "bg-[#0f348b] border-[#0f348b]"
                                            : "border-white/30",
                                    )}
                                >
                                    {checked && (
                                        <svg
                                            width="10"
                                            height="10"
                                            viewBox="0 0 10 10"
                                            fill="none"
                                        >
                                            <path
                                                d="M2 5l2 2 4-4"
                                                stroke="white"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    )}
                                </span>
                                <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-white/10">
                                    {collaborator.imageUrl && (
                                        <Image
                                            src={collaborator.imageUrl}
                                            alt={collaborator.firstName}
                                            fill
                                            sizes="24px"
                                            className="object-cover"
                                        />
                                    )}
                                </div>
                                <span className="truncate">
                                    {collaborator.firstName}{" "}
                                    {collaborator.lastName}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Filters;
