"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Button from "./Button";
import WorkspaceModal from "./WorkspaceModal";
import { userInfo, Workspace } from "@/types/userTypes";
import { formatSessionTime } from "@/lib/textUtils";

type WorkspaceCardProps = {
    workspace: Workspace;
    tutee: userInfo | null;
    showFeedback: boolean;
    usersMap: Record<string, userInfo>;
    friends: userInfo[];
    onUpdated: (workspace: Workspace, collaborators: userInfo[]) => void;
};

const WorkspaceCard = ({
    workspace,
    tutee,
    showFeedback,
    usersMap,
    friends,
    onUpdated,
}: WorkspaceCardProps) => {
    const router = useRouter();
    const [editOpen, setEditOpen] = useState(false);

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
        <div className="flex flex-col gap-4">
            <div className="h-px w-full bg-foreground-third" />
            <div className="flex justify-between">
                <div className="flex gap-4 items-center">
                    {tutee?.imageUrl ? (
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-foreground-third">
                            <Image
                                src={tutee.imageUrl}
                                alt={`${tutee.firstName} ${tutee.lastName}`}
                                fill
                                sizes="40px"
                                className="object-cover"
                                unoptimized
                            />
                        </div>
                    ) : (
                        <div className="w-10 h-10 bg-foreground-third rounded-full" />
                    )}
                    <div className="flex flex-col gap-1">
                        {workspace.title ? (
                            <p className="text-sm font-inter-bold">
                                {workspace.title}
                            </p>
                        ) : (
                            <p className="text-sm font-inter-bold text-foreground-third">
                                Untitled workspace
                            </p>
                        )}
                        <p className="text-xs text-foreground-third max-w-65">
                            {workspace.description
                                ? workspace.description
                                : "No description"}
                        </p>
                    </div>
                </div>
                <div className="flex gap-4 items-center">
                    {workspace.startTime ? (
                        <p className="text-sm font-inter-bold">
                            {formatSessionTime(workspace.startTime)}
                        </p>
                    ) : (
                        <p className="text-sm font-inter-bold text-foreground-third">
                            Unset start time
                        </p>
                    )}
                    <Button
                        text="Join"
                        onClick={() => router.push(`/board/${workspace.id}`)}
                    />
                    <Button text="Edit" onClick={() => setEditOpen(true)} />
                </div>
            </div>
            {showFeedback && workspace.feedback && (
                <div className="text-sm text-foreground-second">
                    {workspace.feedback}
                </div>
            )}
            <WorkspaceModal
                open={editOpen}
                mode={{ kind: "edit", workspace, collaborators }}
                friends={friends}
                onClose={() => setEditOpen(false)}
                onSubmitted={onUpdated}
            />
        </div>
    );
};

export default WorkspaceCard;
