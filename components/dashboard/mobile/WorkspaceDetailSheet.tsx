"use client";

import React from "react";
import { userInfo, Workspace } from "@/types/userTypes";
import { cn } from "@/lib/utils";
import { formatSessionTime } from "@/lib/textUtils";
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
import type { WorkspaceBucket } from "../WorkspaceTableRow";

type WorkspaceDetailSheetProps = {
    open: boolean;
    workspace: Workspace;
    bucket: WorkspaceBucket;
    participants: userInfo[]; // host first
    canManage: boolean;
    onEdit: () => void;
    onClose: () => void;
};

const Field = ({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) => (
    <div className="flex flex-col gap-1">
        <p className="text-caption text-foreground-third">{label}</p>
        {children}
    </div>
);

// No "Join workspace" action by design: the board is desktop-only, so nothing
// below 2xl links to it.
const WorkspaceDetailSheet = ({
    open,
    workspace,
    bucket,
    participants,
    canManage,
    onEdit,
    onClose,
}: WorkspaceDetailSheetProps) => {
    return (
        <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
            <SheetContent
                // Portalled, but still a React child of the row it opened from.
                onClick={(e) => e.stopPropagation()}
            >
                <SheetHeader>
                    <SheetTitle>
                        {workspace.title || "Untitled workspace"}
                    </SheetTitle>
                    <SheetDescription>
                        {workspace.startTime
                            ? formatSessionTime(workspace.startTime)
                            : "No start time set"}
                    </SheetDescription>
                </SheetHeader>

                <SheetBody>
                    <div className="flex flex-col gap-5">
                        <Badge variant="status" className="px-0">
                            <span
                                className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    bucket === "previous"
                                        ? "bg-green-500"
                                        : "bg-amber-400",
                                )}
                            />
                            {bucket === "previous" ? "Completed" : "Upcoming"}
                        </Badge>

                        <Field label="Description">
                            <p className="text-small text-foreground-second leading-5">
                                {workspace.description || "—"}
                            </p>
                        </Field>

                        <Field label="Feedback">
                            <p className="text-small text-foreground-second leading-5">
                                {workspace.feedback || "—"}
                            </p>
                        </Field>

                        <Field label={`Participants (${participants.length})`}>
                            <div className="flex flex-col gap-2 pt-1">
                                {participants.map((person) => (
                                    <div
                                        key={person.id}
                                        className="flex items-center gap-3"
                                    >
                                        <Avatar
                                            size="sm"
                                            className="rounded-md after:rounded-md"
                                        >
                                            <AvatarImage
                                                src={person.imageUrl}
                                                alt=""
                                                className="rounded-md"
                                            />
                                            <AvatarFallback className="rounded-md bg-foreground-third">
                                                {person.firstName.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="min-w-0 flex-1 truncate text-small text-foreground-second">
                                            {`${person.firstName} ${person.lastName}`.trim() ||
                                                person.email}
                                        </span>
                                        {/* Host marked with the same green
                                            dot PeopleStack uses. */}
                                        {person.id === workspace.host && (
                                            <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-green-500" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Field>
                    </div>
                </SheetBody>

                <SheetFooter className="pt-4">
                    {canManage && (
                        <Button size="lg" onClick={onEdit}>
                            Edit workspace
                        </Button>
                    )}
                    <p className="text-caption text-foreground-third text-center">
                        Open Chalkie Chalkie on a computer to join this
                        workspace.
                    </p>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};

export default WorkspaceDetailSheet;
