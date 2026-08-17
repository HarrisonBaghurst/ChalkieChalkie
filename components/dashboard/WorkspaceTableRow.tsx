"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { userInfo, Workspace } from "@/types/userTypes";
import { cn } from "@/lib/utils";
import { formatSessionTime } from "@/lib/textUtils";
import { isHost } from "@/lib/workspaceHost";
import { useUserRole } from "@/hooks/useUserRole";
import PeopleStack from "./PeopleStack";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
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

// On the cells, not the <tr>: border-separate won't render <tr> borders or
// clip the last row's corners reliably.
const cellClass =
    "px-3 py-3 align-middle text-small border-b border-foreground-third/10 group-hover:bg-foreground-third/10";

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

    // Mirrors the API route guard.
    const canManage = role === "tutor" && !!user && isHost(user.id, workspace);

    const people = useMemo<userInfo[]>(
        () =>
            (workspace.collaboratorIds ?? [])
                .filter((id) => id !== workspace.host)
                .map((id) => usersMap[id])
                .filter((u): u is userInfo => !!u),
        [workspace.collaboratorIds, workspace.host, usersMap],
    );

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
            className="group cursor-pointer"
        >
            <td className={cellClass}>
                <PeopleStack people={people} host={usersMap[workspace.host]} />
            </td>
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
                    <span className="">
                        {formatSessionTime(workspace.startTime)}
                    </span>
                ) : (
                    <span className="text-foreground-third">Unset</span>
                )}
            </td>
            <td className={cellClass}>
                {workspace.description ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="block truncate text-left text-foreground-second">
                                {workspace.description}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <div className="w-64 whitespace-normal">
                                {workspace.description}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    <span className="text-foreground-third">—</span>
                )}
            </td>
            <td className={cellClass}>
                {workspace.feedback ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="block truncate text-left text-foreground-second">
                                {workspace.feedback}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <div className="w-64 whitespace-normal">
                                {workspace.feedback}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    <span className="text-foreground-third">—</span>
                )}
            </td>
            <td className={cellClass}>
                <Badge variant="status">
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
            </td>
            <td className={cellClass}>
                <RowActionsMenu
                    actions={[
                        { label: "Join workspace", onSelect: join },
                        ...(canManage
                            ? [
                                  {
                                      label: "Edit workspace",
                                      onSelect: () => setEditOpen(true),
                                  },
                              ]
                            : []),
                    ]}
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
