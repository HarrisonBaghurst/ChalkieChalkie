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
import TapTooltip from "@/components/TapTooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import RowActionsMenu from "./RowActionsMenu";
import WorkspaceModal, { FEEDBACK_STEP } from "./WorkspaceModal";

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
    "px-3 py-3 align-middle text-small border-b border-foreground-third/10";

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
    const [modalStep, setModalStep] = useState<number | null>(null);

    // Mirrors the API route guard.
    const canManage = role === "tutor" && !!user && isHost(user.id, workspace);

    const canAddFeedback = canManage && bucket === "previous";

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
        <tr>
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
                    <TapTooltip
                        content={
                            <div className="w-64 whitespace-normal">
                                {workspace.description}
                            </div>
                        }
                    >
                        <span className="block truncate text-left text-foreground-second">
                            {workspace.description}
                        </span>
                    </TapTooltip>
                ) : (
                    <span className="text-foreground-third">—</span>
                )}
            </td>
            <td className={cellClass}>
                {workspace.feedback ? (
                    <TapTooltip
                        content={
                            <div className="w-64 whitespace-normal">
                                {workspace.feedback}
                            </div>
                        }
                    >
                        <span className="block truncate text-left text-foreground-second">
                            {workspace.feedback}
                        </span>
                    </TapTooltip>
                ) : canAddFeedback ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setModalStep(FEEDBACK_STEP)}
                    >
                        Add feedback
                    </Button>
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
                                      onSelect: () => setModalStep(1),
                                  },
                              ]
                            : []),
                    ]}
                />
                {canManage && (
                    <WorkspaceModal
                        open={modalStep !== null}
                        mode={{ kind: "edit", workspace, collaborators }}
                        friends={friends}
                        initialStep={modalStep ?? 1}
                        onClose={() => setModalStep(null)}
                        onSubmitted={onUpdated}
                        onDeleted={onDeleted}
                    />
                )}
            </td>
        </tr>
    );
};

export default WorkspaceTableRow;
