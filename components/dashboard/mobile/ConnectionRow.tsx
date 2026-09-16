"use client";

import React, { useState } from "react";
import { ChevronRightIcon } from "lucide-react";
import { LinkSummary } from "@/types/linkTypes";
import { formatRelativeTime } from "@/lib/textUtils";
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
import UserAvatar from "@/components/UserAvatar";
import { getFullName } from "@/lib/userColour";
import { Badge } from "@/components/ui/badge";

type ConnectionRowProps = {
    link: LinkSummary;
    onRemove: (linkId: string) => void;
    onToggleActive?: (linkId: string, active: boolean) => void;
};

const ConnectionRow = ({
    link,
    onRemove,
    onToggleActive,
}: ConnectionRowProps) => {
    const [open, setOpen] = useState(false);
    const { counterparty } = link;
    const fullName = getFullName(counterparty);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex w-full items-center gap-3 border-b border-foreground-third/10 px-4 py-3 text-left last:border-b-0 active:bg-foreground-third/10"
            >
                <UserAvatar user={counterparty} />
                <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-small font-inter-bold text-foreground">
                        {fullName || counterparty.email}
                    </span>
                    <span className="truncate text-caption text-foreground-third">
                        {counterparty.email}
                    </span>
                </div>
                {!link.active && <Badge>Inactive</Badge>}
                <ChevronRightIcon className="size-4 shrink-0 text-foreground-third" />
            </button>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>
                            {fullName || counterparty.email}
                        </SheetTitle>
                        <SheetDescription>
                            {counterparty.email}
                        </SheetDescription>
                    </SheetHeader>

                    <SheetBody>
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                                <p className="text-caption text-foreground-third">
                                    Linked
                                </p>
                                <p className="text-small text-foreground-second">
                                    {formatRelativeTime(link.createdAt)}
                                </p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-caption text-foreground-third">
                                    Shared workspaces
                                </p>
                                <p className="text-small text-foreground-second">
                                    {link.sharedWorkspaces} workspace
                                    {link.sharedWorkspaces === 1 ? "" : "s"}
                                </p>
                            </div>
                        </div>
                    </SheetBody>

                    <SheetFooter>
                        {onToggleActive && (
                            <Button
                                variant="secondary"
                                size="lg"
                                onClick={() => {
                                    setOpen(false);
                                    onToggleActive(link.linkId, !link.active);
                                }}
                            >
                                {link.active ? "Deactivate" : "Reactivate"}
                            </Button>
                        )}
                        <Button
                            variant="destructive"
                            size="lg"
                            onClick={() => {
                                setOpen(false);
                                onRemove(link.linkId);
                            }}
                        >
                            Remove link
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </>
    );
};

export default ConnectionRow;
