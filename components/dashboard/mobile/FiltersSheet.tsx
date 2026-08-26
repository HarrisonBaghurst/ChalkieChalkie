"use client";

import React, { useState } from "react";
import { SlidersHorizontalIcon } from "lucide-react";
import { userInfo } from "@/types/userTypes";
import { cn } from "@/lib/utils";
import {
    Sheet,
    SheetBody,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type FiltersSheetProps = {
    collaborators: userInfo[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    hasActiveFilters: boolean;
    onClearFilters: () => void;
};

// The popover and clear button plus the search field overflow a phone's width,
// so below lg they collapse into this one control.
const FiltersSheet = ({
    collaborators,
    selectedIds,
    onChange,
    hasActiveFilters,
    onClearFilters,
}: FiltersSheetProps) => {
    const [open, setOpen] = useState(false);

    const toggle = (id: string) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter((x) => x !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const noMembers = collaborators.length === 0;

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="control-surface flex w-full items-center justify-between gap-2 px-3 py-2 text-small text-foreground-second active:bg-card-background-hover"
            >
                <span className="flex items-center gap-2">
                    <SlidersHorizontalIcon className="size-4 text-foreground-third" />
                    Filters
                </span>
                <span className="text-caption text-foreground-third">
                    {selectedIds.length > 0
                        ? `${selectedIds.length} member${selectedIds.length === 1 ? "" : "s"}`
                        : "None"}
                </span>
            </button>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Filters</SheetTitle>
                        <SheetDescription>
                            Narrow the list to sessions with specific members.
                        </SheetDescription>
                    </SheetHeader>

                    <SheetBody>
                        {noMembers ? (
                            <p className="py-6 text-center text-small text-foreground-third">
                                No members yet
                            </p>
                        ) : (
                            <div className="flex flex-col">
                                {collaborators.map((collaborator) => (
                                    <label
                                        key={collaborator.id}
                                        className="flex w-full items-center gap-3 py-2.5 text-left text-small"
                                    >
                                        <Checkbox
                                            checked={selectedIds.includes(
                                                collaborator.id,
                                            )}
                                            onCheckedChange={() =>
                                                toggle(collaborator.id)
                                            }
                                        />
                                        <Avatar
                                            size="sm"
                                            className="rounded-md after:rounded-md"
                                        >
                                            <AvatarImage
                                                src={collaborator.imageUrl}
                                                alt=""
                                                className="rounded-md"
                                            />
                                            <AvatarFallback className="rounded-md">
                                                {collaborator.firstName.charAt(
                                                    0,
                                                )}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="truncate">
                                            {collaborator.firstName}{" "}
                                            {collaborator.lastName}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </SheetBody>

                    <SheetFooter>
                        <Button size="lg" onClick={() => setOpen(false)}>
                            Done
                        </Button>
                        <Button
                            variant="ghost"
                            size="lg"
                            disabled={!hasActiveFilters}
                            onClick={onClearFilters}
                            className={cn(
                                "text-foreground-third",
                                hasActiveFilters && "hover:text-foreground",
                            )}
                        >
                            Clear filters
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </>
    );
};

export default FiltersSheet;
