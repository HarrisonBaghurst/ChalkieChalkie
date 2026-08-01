"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import WorkspaceModal from "./WorkspaceModal";
import { useUser } from "@clerk/nextjs";
import { userInfo, Workspace } from "@/types/userTypes";
import { formatSessionTime } from "@/lib/textUtils";
import { isHost } from "@/lib/workspaceHost";
import { useUserRole } from "@/hooks/useUserRole";

type WorkspaceCardProps = {
    workspace: Workspace;
    counterparty: userInfo | null;
    showFeedback: boolean;
    usersMap: Record<string, userInfo>;
    friends: userInfo[];
    onUpdated: (workspace: Workspace, collaborators: userInfo[]) => void;
    onDeleted: (workspaceId: string) => void;
};

const WorkspaceCard = ({
    workspace,
    counterparty,
    showFeedback,
    usersMap,
    friends,
    onUpdated,
    onDeleted,
}: WorkspaceCardProps) => {
    const router = useRouter();
    const { user } = useUser();
    const [editOpen, setEditOpen] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const role = useUserRole();

    // Only the workspace host may edit (and therefore delete) it. This mirrors
    // the host_id check enforced by the PATCH/DELETE API routes.
    const canManage = role === "tutor" && !!user && isHost(user.id, workspace);

    const collaborators = useMemo<userInfo[]>(() => {
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

    return (
        <>
            <div className="group relative w-full flex flex-col gap-4 p-5 radius-surface bg-background-second text-left hover:z-10">
                <div className="absolute top-4 right-4 flex gap-2">
                    <div className="-translate-y-3 opacity-0 pointer-events-none transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-hover:pointer-events-auto">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    aria-label={
                                        expanded ? "Collapse" : "Expand"
                                    }
                                    onClick={() => setExpanded((prev) => !prev)}
                                >
                                    <Image
                                        src="/icons/chevron-down-dark.svg"
                                        alt=""
                                        width={18}
                                        height={18}
                                        className={`pointer-events-none transition-transform duration-200 ${
                                            expanded ? "rotate-180" : ""
                                        }`}
                                    />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {expanded ? "Collapse" : "Expand"}
                            </TooltipContent>
                        </Tooltip>
                    </div>
                    {canManage && (
                        <div className="-translate-y-3 opacity-0 pointer-events-none transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-hover:pointer-events-auto">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="icon"
                                        aria-label="Edit workspace"
                                        onClick={() => setEditOpen(true)}
                                    >
                                        <Image
                                            src="/icons/square-pen-dark.svg"
                                            alt=""
                                            width={18}
                                            height={18}
                                            className="pointer-events-none"
                                        />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit workspace</TooltipContent>
                            </Tooltip>
                        </div>
                    )}
                    <div className="-translate-y-3 opacity-0 pointer-events-none transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-hover:pointer-events-auto">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    aria-label="Join workspace"
                                    onClick={() =>
                                        router.push(`/board/${workspace.id}`)
                                    }
                                >
                                    <Image
                                        src="/icons/external-link-dark.svg"
                                        alt=""
                                        width={18}
                                        height={18}
                                        className="pointer-events-none"
                                    />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Join workspace</TooltipContent>
                        </Tooltip>
                    </div>
                </div>
                <div className="flex gap-4 items-center">
                    {counterparty?.imageUrl ? (
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-foreground-third">
                            <Image
                                src={counterparty.imageUrl}
                                alt={`${counterparty.firstName} ${counterparty.lastName}`}
                                fill
                                sizes="40px"
                                className="object-cover"
                                unoptimized
                            />
                        </div>
                    ) : (
                        <div className="w-10 h-10 bg-foreground-third rounded-full" />
                    )}
                    <div className="flex flex-col">
                        {workspace.startTime ? (
                            <p className="text-body font-libre">
                                {formatSessionTime(workspace.startTime)}
                            </p>
                        ) : (
                            <p className="text-body text-foreground-third">
                                Unset start time
                            </p>
                        )}
                        {workspace.title ? (
                            <p className="text-small font-inter-bold">
                                {workspace.title}
                            </p>
                        ) : (
                            <p className="text-small text-foreground-third">
                                Untitled workspace
                            </p>
                        )}
                    </div>
                </div>
                {expanded && (
                    <>
                        <div className="flex flex-col gap-1 max-w-2/3">
                            <p className="text-caption text-foreground-third">
                                Description
                            </p>
                            {workspace.description ? (
                                <p className="text-small text-foreground-second leading-5 max-h-15 overflow-y-auto">
                                    {workspace.description}
                                </p>
                            ) : (
                                <p className="text-small text-foreground-third">
                                    Unset workspace description
                                </p>
                            )}
                        </div>
                        {showFeedback && workspace.feedback && (
                            <div className="flex flex-col gap-1 max-w-2/3">
                                <p className="text-caption text-foreground-third">
                                    Feedback
                                </p>
                                <p className="text-small text-foreground-second leading-5 max-h-15 overflow-y-auto">
                                    {workspace.feedback}
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
            {canManage && (
                <WorkspaceModal
                    open={editOpen}
                    mode={{ kind: "edit", workspace, collaborators }}
                    friends={friends}
                    onClose={() => setEditOpen(false)}
                    onSubmitted={onUpdated}
                    onDeleted={onDeleted}
                />
            )}
        </>
    );
};

export default WorkspaceCard;
