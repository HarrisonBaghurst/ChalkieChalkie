"use client";

import React from "react";
import { userInfo, Workspace } from "@/types/userTypes";
import type { WorkspaceRow as Row } from "../WorkspaceTable";
import WorkspaceRow from "./WorkspaceRow";

type WorkspaceListProps = {
    rows: Row[];
    usersMap: Record<string, userInfo>;
    friends: userInfo[];
    onWorkspaceUpdated: (
        workspace: Workspace,
        collaborators: userInfo[],
    ) => void;
    onWorkspaceDeleted: (workspaceId: string) => void;
};

// Mobile stand-in for WorkspaceTable. Same container chrome — surface
// rounding, hairline border, card fill — so the list reads as the same object
// the table does at 2xl, just with the columns folded into each row's sheet.
//
// overflow-hidden is safe here, unlike on the table: the only overlays these
// rows open are a Sheet and the WorkspaceModal, both of which portal to the
// body rather than rendering inside the container.
const WorkspaceList = ({
    rows,
    usersMap,
    friends,
    onWorkspaceUpdated,
    onWorkspaceDeleted,
}: WorkspaceListProps) => {
    return (
        <div className="w-full overflow-hidden radius-surface border border-foreground-third/15 bg-card-background">
            {rows.length === 0 ? (
                <p className="px-4 py-8 text-center text-caption text-foreground-third">
                    No sessions
                </p>
            ) : (
                rows.map((row) => (
                    <WorkspaceRow
                        key={row.workspace.id}
                        workspace={row.workspace}
                        bucket={row.bucket}
                        usersMap={usersMap}
                        friends={friends}
                        onUpdated={onWorkspaceUpdated}
                        onDeleted={onWorkspaceDeleted}
                    />
                ))
            )}
        </div>
    );
};

export default WorkspaceList;
