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

// overflow-hidden is safe here, unlike on the table: every overlay these rows
// open portals to the body.
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
