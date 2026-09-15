"use client";

import React, { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { userInfo, Workspace } from "@/types/userTypes";
import { cn } from "@/lib/utils";
import { formatSessionTime } from "@/lib/textUtils";
import { isHost } from "@/lib/workspaceHost";
import { pickCounterparties } from "@/lib/dashboardCounterparty";
import { joinDenialLabel, lifecycleStatus } from "@/lib/workspaceLifecycle";
import {
    WORKSPACE_TABLE_COLUMNS,
    WorkspaceColumnKey,
} from "@/lib/dashboardTableColumns";
import { useUserRole } from "@/hooks/useUserRole";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useNow } from "@/hooks/useNow";
import { useJoinWorkspace } from "@/hooks/useJoinWorkspace";
import PeopleStack from "./PeopleStack";
import TapTooltip from "@/components/TapTooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableRow } from "./DataTable";
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

const truncated = (text: string) => (
    <TapTooltip content={<div className="w-64 whitespace-normal">{text}</div>}>
        <span className="block truncate text-left text-foreground-second">
            {text}
        </span>
    </TapTooltip>
);

const WorkspaceTableRow = ({
    workspace,
    bucket,
    usersMap,
    friends,
    onUpdated,
    onDeleted,
}: WorkspaceTableRowProps) => {
    const { user } = useUser();
    const role = useUserRole();
    const { entitlements } = useEntitlements();
    const now = useNow();
    const [modalStep, setModalStep] = useState<number | null>(null);

    const viewerIsHost = !!user && isHost(user.id, workspace);

    const status = lifecycleStatus(workspace, viewerIsHost, now);
    const joinDenial = joinDenialLabel(workspace, viewerIsHost, now);

    const { join, dialog } = useJoinWorkspace(workspace, viewerIsHost, now);

    const canManage = role === "tutor" && viewerIsHost;

    const canAddFeedback = canManage && bucket === "previous";

    const memberCap = entitlements?.maxWorkspaceMembers ?? null;
    const memberCount = (workspace.collaboratorIds ?? []).length;
    const overCap =
        canManage &&
        bucket === "upcoming" &&
        memberCap !== null &&
        memberCount > memberCap;

    const people = useMemo<userInfo[]>(
        () => pickCounterparties(workspace, usersMap, user?.id),
        [workspace, usersMap, user?.id],
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

    const cells: Record<WorkspaceColumnKey, React.ReactNode> = {
        people: (
            <div className="flex items-center gap-2">
                <PeopleStack
                    people={people}
                    participants={collaborators}
                    hostId={workspace.host}
                />
                {overCap && (
                    <TapTooltip
                        content={
                            <div className="w-56 whitespace-normal">
                                This workspace has {memberCount} people but your
                                plan allows {memberCap}. Remove{" "}
                                {memberCount - (memberCap ?? 0)} before the
                                lesson, or only some will get in.
                            </div>
                        }
                    >
                        <Badge variant="destructive">Over limit</Badge>
                    </TapTooltip>
                )}
            </div>
        ),
        header: workspace.title ? (
            truncated(workspace.title)
        ) : (
            <span className="text-foreground-third">Untitled workspace</span>
        ),
        startTime: workspace.startTime ? (
            <span className="whitespace-nowrap text-foreground-second">
                {formatSessionTime(workspace.startTime)}
            </span>
        ) : (
            <span className="text-foreground-third">Unset</span>
        ),
        description: workspace.description ? (
            truncated(workspace.description)
        ) : (
            <span className="text-foreground-third">—</span>
        ),
        feedback: workspace.feedback ? (
            truncated(workspace.feedback)
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
        ),
        status: (
            <Badge variant="status" suppressHydrationWarning>
                <span
                    className={cn("w-1.5 h-1.5 rounded-full", status.dotClass)}
                />
                {status.label}
            </Badge>
        ),
        actions: (
            <>
                <RowActionsMenu
                    actions={[
                        {
                            label: joinDenial ?? "Join workspace",
                            onSelect: join,
                            disabled: !!joinDenial,
                        },
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
                {dialog}
            </>
        ),
    };

    return <DataTableRow columns={WORKSPACE_TABLE_COLUMNS} cells={cells} />;
};

export default WorkspaceTableRow;
