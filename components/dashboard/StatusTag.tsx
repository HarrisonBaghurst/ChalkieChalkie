import React from "react";
import { cn } from "@/lib/utils";

export type WorkspaceStatus = "upcoming" | "completed";

type StatusTagProps = {
    status: WorkspaceStatus;
};

// Small status pill mirroring the InfoTag styling, with a coloured dot to
// distinguish upcoming (amber) from completed (green) sessions.
const StatusTag = ({ status }: StatusTagProps) => {
    const completed = status === "completed";
    return (
        <span className="inline-flex items-center gap-1.5 w-fit text-foreground-second text-small font-inter-regular px-2 py-1 radius-tag">
            <span
                className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    completed ? "bg-green-500" : "bg-amber-400",
                )}
            />
            {completed ? "Completed" : "Upcoming"}
        </span>
    );
};

export default StatusTag;
