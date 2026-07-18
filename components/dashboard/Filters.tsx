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
                    "control-surface py-2 px-3 w-full flex items-center justify-between cursor-pointer text-small gap-2",
                    disabled
                        ? "cursor-not-allowed text-foreground-third"
                        : "hover:bg-card-background-hover",
                )}
            >
                <span>{label}</span>
                <Image
                    src="/icons/chevron-down.svg"
                    alt=""
                    width={12}
                    height={12}
                    className={cn(
                        "opacity-50 transition-transform duration-150 shrink-0",
                        open && "rotate-180",
                    )}
                />
            </button>

            {open && !disabled && (
                <div className="absolute top-[calc(100%+6px)] right-0 z-10 w-75 max-h-72 overflow-y-auto control-surface">
                    {collaborators.map((collaborator) => {
                        const checked = selectedIds.includes(collaborator.id);
                        return (
                            <button
                                key={collaborator.id}
                                onClick={() => toggle(collaborator.id)}
                                className="flex w-full items-center gap-3 px-3 py-2 text-left text-small hover:bg-card-background-hover cursor-pointer"
                            >
                                <Image
                                    src={
                                        checked
                                            ? "/icons/square-check.svg"
                                            : "/icons/square.svg"
                                    }
                                    alt=""
                                    width={16}
                                    height={16}
                                    className="shrink-0"
                                />
                                <div className="relative h-6 w-6 shrink-0 overflow-hidden radius-tag bg-white/10">
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
