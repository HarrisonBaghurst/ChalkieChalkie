import React from "react";
import Skeleton from "@/components/ui/Skeleton";
import { CONNECTIONS_TABLE_COLUMNS } from "@/lib/connectionsTableColumns";

const PLACEHOLDER_ROWS = 4;

const cellClass = "px-3 py-3 align-middle border-b border-foreground-third/10";

// Placeholder <tr> mirroring ConnectionRow cell for cell: avatar + name/email,
// linked-time, workspace-count badge, actions button.
const ConnectionRowSkeleton = () => (
    <tr>
        <td className={cellClass}>
            <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-md" />
                <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                </div>
            </div>
        </td>
        <td className={cellClass}>
            <Skeleton className="h-4 w-24" />
        </td>
        <td className={cellClass}>
            <Skeleton className="h-6 w-24 radius-tag" />
        </td>
        <td className={cellClass}>
            <div className="flex justify-end">
                <Skeleton className="h-8 w-8 radius-control" />
            </div>
        </td>
    </tr>
);

type ConnectionsSkeletonProps = {
    heading: string;
};

// Mirrors ConnectionsClient's populated layout: heading, action button and
// column headers render for real; only the rows shimmer, so nothing shifts
// once the /api/links fetch lands. Slots into DashboardShell's content column.
const ConnectionsSkeleton = ({ heading }: ConnectionsSkeletonProps) => {
    return (
        <>
            <div className="flex items-center justify-between">
                <p className="text-heading font-inter-bold">{heading}</p>
                <Skeleton className="h-9 w-36 radius-control" />
            </div>

            <div className="w-full radius-surface border border-foreground-third/15 bg-card-background">
                <table className="w-full table-fixed border-separate border-spacing-0 [&_tbody_tr:last-child>td]:border-b-0 [&_tbody_tr:last-child>td:first-child]:rounded-bl-[13px] [&_tbody_tr:last-child>td:last-child]:rounded-br-[13px]">
                    <thead>
                        <tr>
                            {CONNECTIONS_TABLE_COLUMNS.map((col, i) => (
                                <th
                                    key={col.key}
                                    className={`${col.width} border-b border-foreground-third/15 bg-background-second px-3 py-3 text-left text-caption font-inter-regular text-foreground-third ${
                                        i === 0 ? "rounded-tl-[13px]" : ""
                                    } ${
                                        i ===
                                        CONNECTIONS_TABLE_COLUMNS.length - 1
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
                        {Array.from({ length: PLACEHOLDER_ROWS }).map(
                            (_, i) => (
                                <ConnectionRowSkeleton key={i} />
                            ),
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default ConnectionsSkeleton;
