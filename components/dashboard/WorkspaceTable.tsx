"use client";

import React from "react";
import { userInfo, Workspace } from "@/types/userTypes";
import WorkspaceTableRow, { WorkspaceBucket } from "./WorkspaceTableRow";

export type WorkspaceRow = {
    workspace: Workspace;
    bucket: WorkspaceBucket;
};

type WorkspaceTableProps = {
    rows: WorkspaceRow[];
    usersMap: Record<string, userInfo>;
    friends: userInfo[];
    onWorkspaceUpdated: (
        workspace: Workspace,
        collaborators: userInfo[],
    ) => void;
    onWorkspaceDeleted: (workspaceId: string) => void;
};

const COLUMNS = [
    { key: "header", label: "Header", width: "w-[22%]" },
    { key: "startTime", label: "Start time", width: "w-[15%]" },
    { key: "status", label: "Status", width: "w-[12%]" },
    { key: "people", label: "People", width: "w-[12%]" },
    { key: "description", label: "Description", width: "w-[18%]" },
    { key: "feedback", label: "Feedback", width: "w-[16%]" },
    { key: "actions", label: "", width: "w-[5%]" },
] as const;

const WorkspaceTable = ({
    rows,
    usersMap,
    friends,
    onWorkspaceUpdated,
    onWorkspaceDeleted,
}: WorkspaceTableProps) => {
    return (
        <div className="w-full overflow-hidden radius-surface border border-foreground-third/15 bg-card-background">
            <table className="w-full table-fixed border-collapse">
                <thead>
                    <tr className="border-b border-foreground-third/15 bg-background-second">
                        {COLUMNS.map((col) => (
                            <th
                                key={col.key}
                                className={`${col.width} px-3 py-3 text-left text-caption font-inter-regular text-foreground-third`}
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td
                                colSpan={COLUMNS.length}
                                className="px-3 py-8 text-center text-caption text-foreground-third"
                            >
                                No sessions
                            </td>
                        </tr>
                    ) : (
                        rows.map((row) => (
                            <WorkspaceTableRow
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
                </tbody>
            </table>
        </div>
    );
};

export default WorkspaceTable;
