"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { userInfo, Workspace } from "@/types/userTypes";
import { formatSessionTime } from "@/lib/textUtils";
import { isHost } from "@/lib/workspaceHost";
import { useUserRole } from "@/hooks/useUserRole";
import PeopleStack from "./PeopleStack";
import StatusTag from "./StatusTag";
import RowActionsMenu from "./RowActionsMenu";
import WorkspaceModal from "./WorkspaceModal";

export type WorkspaceBucket = "upcoming" | "previous";

type WorkspaceTableRowProps = {
    workspace: Workspace;
    bucket: WorkspaceBucket;
    usersMap: Record<string, userInfo>;
    friends: userInfo[];
    onUpdated: (workspace: Workspace, collaborators: userInfo[]) => void;
    onDeleted: (workspaceId: string) => void;
};

const cellClass = "px-3 py-3 align-middle text-small";

const WorkspaceTableRow = ({
    workspace,
    bucket,
    usersMap,
    friends,
    onUpdated,
    onDeleted,
}: WorkspaceTableRowProps) => {
    const router = useRouter();
    const { user } = useUser();
    const role = useUserRole();
    const [editOpen, setEditOpen] = useState(false);

    // Only the workspace host may edit it, mirroring the API route guard.
    const canManage = role === "tutor" && !!user && isHost(user.id, workspace);

    // Members shown in the People column: everyone on the workspace except the
    // creator/host, resolved to user records, capped downstream to the first 3.
    const people = useMemo<userInfo[]>(
        () =>
            (workspace.collaboratorIds ?? [])
                .filter((id) => id !== workspace.host)
                .map((id) => usersMap[id])
                .filter((u): u is userInfo => !!u),
        [workspace.collaboratorIds, workspace.host, usersMap],
    );

    // Ordered collaborator list (host first) for the edit modal.
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

    const join = () => router.push(`/board/${workspace.id}`);

    return (
        <tr
            onClick={join}
            className="group cursor-pointer border-b border-foreground-third/10 hover:bg-foreground-third/10"
        >
                <td className={cellClass}>
                    {workspace.title ? (
                        <span className="font-inter-bold text-foreground">
                            {workspace.title}
                        </span>
                    ) : (
                        <span className="text-foreground-third">
                            Untitled workspace
                        </span>
                    )}
                </td>
                <td className={cellClass}>
                    {workspace.startTime ? (
                        <span className="font-libre">
                            {formatSessionTime(workspace.startTime)}
                        </span>
                    ) : (
                        <span className="text-foreground-third">Unset</span>
                    )}
                </td>
                <td className={cellClass}>
                    <StatusTag
                        status={bucket === "previous" ? "completed" : "upcoming"}
                    />
                </td>
                <td className={cellClass}>
                    <PeopleStack people={people} />
                </td>
                <td className={cellClass}>
                    {workspace.description ? (
                        <span className="block truncate text-foreground-second">
                            {workspace.description}
                        </span>
                    ) : (
                        <span className="text-foreground-third">—</span>
                    )}
                </td>
                <td className={cellClass}>
                    {workspace.feedback ? (
                        <span className="block truncate text-foreground-second">
                            {workspace.feedback}
                        </span>
                    ) : (
                        <span className="text-foreground-third">—</span>
                    )}
                </td>
                <td className={cellClass}>
                    <RowActionsMenu
                        onJoin={join}
                        onEdit={
                            canManage ? () => setEditOpen(true) : undefined
                        }
                    />
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
                </td>
            </tr>
    );
};

export default WorkspaceTableRow;
