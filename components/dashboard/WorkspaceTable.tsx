"use client";

import React from "react";
import { userInfo, Workspace } from "@/types/userTypes";
import { WORKSPACE_TABLE_COLUMNS } from "@/lib/dashboardTableColumns";
import DataTable from "./DataTable";
import WorkspaceTableRow, { WorkspaceBucket } from "./WorkspaceTableRow";

export type WorkspaceRow = {
    workspace: Workspace;
    bucket: WorkspaceBucket;
};

type WorkspaceTableProps = {
    rows: WorkspaceRow[];
    usersMap: Record<string, userInfo>;
    friends: userInfo[];
    toolbar?: React.ReactNode;
    onWorkspaceUpdated: (
        workspace: Workspace,
        collaborators: userInfo[],
    ) => void;
    onWorkspaceDeleted: (workspaceId: string) => void;
};

const WorkspaceTable = ({
    rows,
    usersMap,
    friends,
    toolbar,
    onWorkspaceUpdated,
    onWorkspaceDeleted,
}: WorkspaceTableProps) => {
    return (
        <DataTable
            columns={WORKSPACE_TABLE_COLUMNS}
            toolbar={toolbar}
            empty="No sessions"
        >
            {rows.map((row) => (
                <WorkspaceTableRow
                    key={row.workspace.id}
                    workspace={row.workspace}
                    bucket={row.bucket}
                    usersMap={usersMap}
                    friends={friends}
                    onUpdated={onWorkspaceUpdated}
                    onDeleted={onWorkspaceDeleted}
                />
            ))}
        </DataTable>
    );
};

export default WorkspaceTable;
