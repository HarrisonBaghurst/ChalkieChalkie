"use client";

import React, { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { ChevronRightIcon } from "lucide-react";
import { userInfo, Workspace } from "@/types/userTypes";
import { cn } from "@/lib/utils";
import { formatSessionTime } from "@/lib/textUtils";
import { isHost } from "@/lib/workspaceHost";
import { useUserRole } from "@/hooks/useUserRole";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { WorkspaceBucket } from "../WorkspaceTableRow";
import WorkspaceModal, { FEEDBACK_STEP } from "../WorkspaceModal";
import WorkspaceDetailSheet from "./WorkspaceDetailSheet";

type WorkspaceRowProps = {
    workspace: Workspace;
    bucket: WorkspaceBucket;
    usersMap: Record<string, userInfo>;
    friends: userInfo[];
    onUpdated: (workspace: Workspace, collaborators: userInfo[]) => void;
    onDeleted: (workspaceId: string) => void;
};

// Everything the desktop table spreads across columns moves into the tap-open
// sheet, so nothing here depends on hover.
const WorkspaceRow = ({
    workspace,
    bucket,
    usersMap,
    friends,
    onUpdated,
    onDeleted,
}: WorkspaceRowProps) => {
    const { user } = useUser();
    const role = useUserRole();
    const [detailOpen, setDetailOpen] = useState(false);
    const [modalStep, setModalStep] = useState<number | null>(null);

    // Mirrors the API route guard.
    const canManage = role === "tutor" && !!user && isHost(user.id, workspace);

    const canAddFeedback = canManage && bucket === "previous";

    const participants = useMemo<userInfo[]>(() => {
        const ordered = [
            workspace.host,
            ...(workspace.collaboratorIds ?? []).filter(
                (id) => id !== workspace.host,
            ),
        ];
        return ordered
            .map((id) => usersMap[id])
            .filter((u): u is userInfo => !!u);
    }, [workspace.host, workspace.collaboratorIds, usersMap]);

    // A host sees their first student, everyone else sees the host.
    const counterparty = useMemo<userInfo | null>(() => {
        const viewerHosts = !!user && isHost(user.id, workspace);
        if (!viewerHosts) return usersMap[workspace.host] ?? null;
        return participants.find((p) => p.id !== workspace.host) ?? null;
    }, [user, workspace, usersMap, participants]);

    const statusLabel = bucket === "previous" ? "Completed" : "Upcoming";

    return (
        <>
            <button
                type="button"
                onClick={() => setDetailOpen(true)}
                className="flex w-full items-center gap-3 border-b border-foreground-third/10 px-4 py-3 text-left last:border-b-0 active:bg-foreground-third/10"
            >
                <Avatar className="rounded-md after:rounded-md">
                    <AvatarImage
                        src={counterparty?.imageUrl}
                        alt=""
                        className="rounded-md"
                    />
                    <AvatarFallback className="rounded-md bg-foreground-third">
                        {counterparty?.firstName.charAt(0) ?? ""}
                    </AvatarFallback>
                </Avatar>

                <div className="flex min-w-0 flex-1 flex-col">
                    <span
                        className={cn(
                            "truncate text-small font-inter-bold",
                            workspace.title
                                ? "text-foreground"
                                : "text-foreground-third",
                        )}
                    >
                        {workspace.title || "Untitled workspace"}
                    </span>
                    <span className="truncate text-caption text-foreground-third">
                        {workspace.startTime
                            ? formatSessionTime(workspace.startTime)
                            : "Unset"}
                    </span>
                </div>

                {/* The dot alone carries the status here; the sheet spells it
                    out with the same Badge the table row uses. */}
                <span
                    className={cn(
                        "w-1.5 h-1.5 shrink-0 rounded-full",
                        bucket === "previous" ? "bg-green-500" : "bg-amber-400",
                    )}
                />
                <span className="sr-only">{statusLabel}</span>
                <ChevronRightIcon className="size-4 shrink-0 text-foreground-third" />
            </button>

            <WorkspaceDetailSheet
                open={detailOpen}
                workspace={workspace}
                bucket={bucket}
                participants={participants}
                canManage={canManage}
                canAddFeedback={canAddFeedback}
                onEdit={() => {
                    setDetailOpen(false);
                    setModalStep(1);
                }}
                onAddFeedback={() => {
                    setDetailOpen(false);
                    setModalStep(FEEDBACK_STEP);
                }}
                onClose={() => setDetailOpen(false)}
            />

            {canManage && (
                <WorkspaceModal
                    open={modalStep !== null}
                    mode={{ kind: "edit", workspace, collaborators: participants }}
                    friends={friends}
                    initialStep={modalStep ?? 1}
                    onClose={() => setModalStep(null)}
                    onSubmitted={onUpdated}
                    onDeleted={onDeleted}
                />
            )}
        </>
    );
};

export default WorkspaceRow;
