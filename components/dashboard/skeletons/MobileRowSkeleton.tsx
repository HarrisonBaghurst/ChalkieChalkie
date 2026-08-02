import React from "react";
import Skeleton from "@/components/ui/Skeleton";

// Placeholder for the compact rows both mobile lists use (mobile/WorkspaceRow
// and mobile/ConnectionRow): avatar, two stacked lines, trailing chevron. Same
// padding and divider as the real rows so nothing shifts when data lands.
const MobileRowSkeleton = ({ showStatus = false }: { showStatus?: boolean }) => (
    <div className="flex items-center gap-3 border-b border-foreground-third/10 px-4 py-3 last:border-b-0">
        <Skeleton className="w-8 h-8 rounded-md" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
        </div>
        {showStatus && <Skeleton className="w-1.5 h-1.5 rounded-full" />}
        <Skeleton className="size-4" />
    </div>
);

// The container both mobile lists render their rows into.
export const MobileListSkeleton = ({
    rows,
    showStatus = false,
}: {
    rows: number;
    showStatus?: boolean;
}) => (
    <div className="w-full overflow-hidden radius-surface border border-foreground-third/15 bg-card-background">
        {Array.from({ length: rows }).map((_, i) => (
            <MobileRowSkeleton key={i} showStatus={showStatus} />
        ))}
    </div>
);

export default MobileRowSkeleton;
