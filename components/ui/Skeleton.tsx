import React from "react";
import { cn } from "@/lib/utils";

type SkeletonProps = {
    className?: string;
};

// A single placeholder block. Size it via `className`; the chalk gradient
// shimmer band sweeps across it (see `.skeleton-shimmer` in globals.css).
const Skeleton = ({ className }: SkeletonProps) => {
    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-md bg-white/5",
                className,
            )}
        >
            <div className="skeleton-shimmer" />
        </div>
    );
};

export default Skeleton;
