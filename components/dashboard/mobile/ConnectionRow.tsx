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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ConnectionRowProps = {
    link: LinkSummary;
    onRemove: (linkId: string) => void;
};

// Mobile counterpart to ConnectionRow's table row. The one action a link has —
// removing it — lives behind the same tap-for-detail sheet the workspace rows
// use, rather than the desktop row's trailing actions menu.
const ConnectionRow = ({ link, onRemove }: ConnectionRowProps) => {
    const [open, setOpen] = useState(false);
    const { counterparty } = link;
    const fullName = `${counterparty.firstName} ${counterparty.lastName}`.trim();

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex w-full items-center gap-3 border-b border-foreground-third/10 px-4 py-3 text-left last:border-b-0 active:bg-foreground-third/10"
            >
                <Avatar className="rounded-md after:rounded-md">
                    <AvatarImage
                        src={counterparty.imageUrl}
                        alt=""
                        className="rounded-md"
                    />
                    <AvatarFallback className="rounded-md bg-foreground-third">
                        {counterparty.firstName.charAt(0)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-small font-inter-bold text-foreground">
                        {fullName || counterparty.email}
                    </span>
                    <span className="truncate text-caption text-foreground-third">
                        {counterparty.email}
                    </span>
                </div>
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
                                <Badge>
                                    {link.sharedWorkspaces} workspace
                                    {link.sharedWorkspaces === 1 ? "" : "s"}
                                </Badge>
                            </div>
                        </div>
                    </SheetBody>

                    <SheetFooter>
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
