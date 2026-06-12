import React from "react";
import Skeleton from "@/components/ui/Skeleton";

// Mirrors the layout of dashboard/WorkspaceCard.tsx: a divider, an avatar +
// title/description column, and right-aligned time/action placeholders.
const WorkspaceCardSkeleton = () => {
    return (
        <div className="flex flex-col gap-4">
            <div className="h-px w-full bg-foreground-third" />
            <div className="flex justify-between">
                <div className="flex gap-4 items-center">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                    </div>
                </div>
                <div className="flex gap-4 items-center">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16 rounded-full" />
                </div>
            </div>
        </div>
    );
};

export default WorkspaceCardSkeleton;
