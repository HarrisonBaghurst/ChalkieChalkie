"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Button from "./Button";
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
        <div className="flex flex-col gap-4">
            <div className="h-px w-full bg-foreground-third" />
            <div className="flex justify-between gap-4">
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
                    <div className="flex flex-col gap-1">
                        {workspace.title ? (
                            <p className="text-secondary font-inter-bold">
                                {workspace.title}
                            </p>
                        ) : (
                            <p className="text-secondary font-inter-bold">
                                Untitled workspace
                            </p>
                        )}
                        <p className="text-caption text-foreground-third max-w-65">
                            {workspace.description
                                ? workspace.description
                                : "No description"}
                        </p>
                    </div>
                </div>
                <div className="flex gap-4 items-center">
                    {workspace.startTime ? (
                        <p className="text-secondary font-inter-bold">
                            {formatSessionTime(workspace.startTime)}
                        </p>
                    ) : (
                        <p className="text-secondary font-inter-bold">
                            Unset start time
                        </p>
                    )}
                    <div className="hidden 2xl:block">
                        <Button
                            text="Join"
                            onClick={() =>
                                router.push(`/board/${workspace.id}`)
                            }
                        />
                    </div>
                    {canManage && (
                        <Button text="Edit" onClick={() => setEditOpen(true)} />
                    )}
                </div>
            </div>
            {showFeedback && workspace.feedback && (
                <div className="text-secondary">{workspace.feedback}</div>
            )}
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
        </div>
    );
};

export default WorkspaceCard;
