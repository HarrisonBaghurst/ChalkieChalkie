import React from "react";
import Skeleton from "@/components/ui/Skeleton";
import { DataTableRow } from "../DataTable";
import {
    WORKSPACE_TABLE_COLUMNS,
    WorkspaceColumnKey,
} from "@/lib/dashboardTableColumns";

const cells: Record<WorkspaceColumnKey, React.ReactNode> = {
    people: (
        <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 radius-tag" />
        </div>
    ),
    header: <Skeleton className="h-4 w-3/4" />,
    startTime: <Skeleton className="h-4 w-4/5" />,
    description: <Skeleton className="h-4 w-full" />,
    feedback: <Skeleton className="h-4 w-2/3" />,
    status: <Skeleton className="h-6 w-24 radius-tag" />,
    actions: (
        <div className="flex justify-end">
            <Skeleton className="h-8 w-8 radius-control" />
        </div>
    ),
};

const WorkspaceTableRowSkeleton = () => (
    <DataTableRow columns={WORKSPACE_TABLE_COLUMNS} cells={cells} />
);

export default WorkspaceTableRowSkeleton;
