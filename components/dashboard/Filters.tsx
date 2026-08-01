"use client";

import Image from "next/image";
import { useState } from "react";
import { userInfo } from "@/types/userTypes";
import { cn } from "@/lib/utils";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface FiltersProps {
    collaborators: userInfo[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
}

const Filters = ({ collaborators, selectedIds, onChange }: FiltersProps) => {
    const [open, setOpen] = useState(false);

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
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                disabled={disabled}
                suppressHydrationWarning
                className={cn(
                    "control-surface py-2 px-3 w-full flex items-center justify-between cursor-pointer text-small gap-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
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
            </PopoverTrigger>

            <PopoverContent
                align="end"
                className="w-75 max-h-72 gap-0 overflow-y-auto p-0"
            >
                {collaborators.map((collaborator) => {
                    const checked = selectedIds.includes(collaborator.id);
                    return (
                        <label
                            key={collaborator.id}
                            className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-small hover:bg-card-background-hover"
                        >
                            <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggle(collaborator.id)}
                            />
                            <Avatar
                                size="sm"
                                className="rounded-md after:rounded-md"
                            >
                                <AvatarImage
                                    src={collaborator.imageUrl}
                                    alt={collaborator.firstName}
                                    className="rounded-md"
                                />
                                <AvatarFallback className="rounded-md">
                                    {collaborator.firstName.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <span className="truncate">
                                {collaborator.firstName}{" "}
                                {collaborator.lastName}
                            </span>
                        </label>
                    );
                })}
            </PopoverContent>
        </Popover>
    );
};

export default Filters;
