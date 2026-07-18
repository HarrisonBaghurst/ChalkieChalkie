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
    { key: "people", label: "People", width: "w-[12%]" },
    { key: "header", label: "Header", width: "w-[22%]" },
    { key: "startTime", label: "Start time", width: "w-[15%]" },
    { key: "description", label: "Description", width: "w-[18%]" },
    { key: "feedback", label: "Feedback", width: "w-[16%]" },
    { key: "status", label: "Status", width: "w-[12%]" },
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
        <div className="w-full radius-surface border border-foreground-third/15 bg-card-background">
            {/* border-separate (not collapse) so the header/last-row cells can
                carry their own rounded corners. This keeps the table visually
                rounded WITHOUT an overflow-hidden on the container, which would
                otherwise clip row popovers (e.g. RowActionsMenu) at the edges.
                Corner radius is 13px = radius-surface (14px) minus the 1px
                border, so cells nest cleanly inside the rounded container. */}
            <table className="w-full table-fixed border-separate border-spacing-0 [&_tbody_tr:last-child>td]:border-b-0 [&_tbody_tr:last-child>td:first-child]:rounded-bl-[13px] [&_tbody_tr:last-child>td:last-child]:rounded-br-[13px]">
                <thead>
                    <tr>
                        {COLUMNS.map((col, i) => (
                            <th
                                key={col.key}
                                className={`${col.width} border-b border-foreground-third/15 bg-background-second px-3 py-3 text-left text-caption font-inter-regular text-foreground-third ${
                                    i === 0 ? "rounded-tl-[13px]" : ""
                                } ${
                                    i === COLUMNS.length - 1
                                        ? "rounded-tr-[13px]"
                                        : ""
                                }`}
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
