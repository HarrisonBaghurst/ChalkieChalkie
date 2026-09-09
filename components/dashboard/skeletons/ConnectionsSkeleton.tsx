import React from "react";
import Skeleton from "@/components/ui/Skeleton";
import {
    CONNECTIONS_TABLE_COLUMNS,
    ConnectionColumnKey,
} from "@/lib/connectionsTableColumns";
import DataTable, { DataTableRow } from "../DataTable";
import { MobileListSkeleton } from "./MobileRowSkeleton";

const PLACEHOLDER_ROWS = 4;

const cells: Record<ConnectionColumnKey, React.ReactNode> = {
    person: (
        <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-md" />
            <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
            </div>
        </div>
    ),
    linked: <Skeleton className="h-4 w-24" />,
    workspaces: <Skeleton className="h-4 w-24" />,
    actions: (
        <div className="flex justify-end">
            <Skeleton className="h-8 w-8 radius-control" />
        </div>
    ),
};

const ConnectionRowSkeleton = () => (
    <DataTableRow columns={CONNECTIONS_TABLE_COLUMNS} cells={cells} />
);

type ConnectionsSkeletonProps = {
    heading: string;
};

const ConnectionsSkeleton = ({ heading }: ConnectionsSkeletonProps) => {
    return (
        <>
            <div className="flex items-center justify-between">
                <p className="text-heading font-inter-bold">{heading}</p>
                <Skeleton className="hidden h-9 w-36 radius-control md:block" />
            </div>

            <div className="md:hidden">
                <MobileListSkeleton rows={PLACEHOLDER_ROWS} />
            </div>

            <div className="hidden md:block">
                <DataTable columns={CONNECTIONS_TABLE_COLUMNS}>
                    {Array.from({ length: PLACEHOLDER_ROWS }).map((_, i) => (
                        <ConnectionRowSkeleton key={i} />
                    ))}
                </DataTable>
            </div>
        </>
    );
};

export default ConnectionsSkeleton;
