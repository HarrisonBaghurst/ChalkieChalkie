import React from "react";
import Skeleton from "@/components/ui/Skeleton";
import WorkspaceCardSkeleton from "./WorkspaceCardSkeleton";

// Placeholder column shown while the dashboard's workspaces/users fetch is in
// flight. Mirrors the real tree rendered by DashboardClient: Next card, Actions
// row, divider, then the Upcoming/Previous two-column grid. Slots into the
// existing `ml-75 … flex flex-col gap-6` container.
const ListPanelSkeleton = ({ label }: { label: string }) => {
    return (
        <div className="w-1/2 bg-card-background radius-surface p-4 flex flex-col gap-4 h-fit">
            <p className="text-caption text-foreground-third font-inter-bold">
                {label}
            </p>
            <div className="flex gap-4">
                <Skeleton className="h-9 w-2/3" />
                <Skeleton className="h-9 w-1/3" />
            </div>
            <div className="flex flex-col gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <WorkspaceCardSkeleton key={i} />
                ))}
            </div>
        </div>
    );
};

const DashboardSkeleton = () => {
    return (
        <>
            {/* Next ("coming up next") card */}
            <div className="w-220 bg-card-background border-2 p-4 radius-surface flex justify-between gradient-border">
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-5 w-56" />
                    <Skeleton className="h-3 w-80" />
                </div>
                <div className="flex flex-col justify-center gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-32 rounded-full" />
                </div>
            </div>

            {/* Actions row */}
            <div className="flex gap-6">
                <Skeleton className="h-8 w-40 rounded-full" />
                <Skeleton className="h-8 w-36 rounded-full" />
            </div>

            <div className="h-px w-full bg-foreground-third" />

            <div className="flex gap-6 w-full">
                <ListPanelSkeleton label="UPCOMING" />
                <ListPanelSkeleton label="PREVIOUS" />
            </div>
        </>
    );
};

export default DashboardSkeleton;
