import React from "react";
import Skeleton from "@/components/ui/Skeleton";

// Placeholder <tr> mirroring dashboard/WorkspaceTableRow.tsx cell for cell:
// avatar stack, title, start time, description, feedback, status pill and the
// trailing actions button. Same padding/divider as the real row (minus hover)
// so rows don't shift height when the data lands.
const cellClass = "px-3 py-3 align-middle border-b border-foreground-third/10";

const WorkspaceTableRowSkeleton = () => {
    return (
        <tr>
            <td className={cellClass}>
                {/* PeopleStack: one avatar, sized to match w-8 h-8 radius-tag */}
                <div className="flex items-center gap-2">
                    <Skeleton className="w-8 h-8 radius-tag" />
                </div>
            </td>
            <td className={cellClass}>
                <Skeleton className="h-4 w-3/4" />
            </td>
            <td className={cellClass}>
                <Skeleton className="h-4 w-4/5" />
            </td>
            <td className={cellClass}>
                <Skeleton className="h-4 w-full" />
            </td>
            <td className={cellClass}>
                <Skeleton className="h-4 w-2/3" />
            </td>
            <td className={cellClass}>
                {/* Status badge */}
                <Skeleton className="h-6 w-24 radius-tag" />
            </td>
            <td className={cellClass}>
                <div className="flex justify-end">
                    <Skeleton className="h-8 w-8 radius-control" />
                </div>
            </td>
        </tr>
    );
};

export default WorkspaceTableRowSkeleton;
