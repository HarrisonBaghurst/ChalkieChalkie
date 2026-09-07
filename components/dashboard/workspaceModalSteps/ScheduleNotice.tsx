import React from "react";
import { cn } from "@/lib/utils";

type ScheduleNoticeProps = {
    tone?: "warning" | "muted";
    children: React.ReactNode;
};

const ScheduleNotice = ({
    tone = "warning",
    children,
}: ScheduleNoticeProps) => (
    <p
        className={cn(
            "radius-control border p-3 text-caption leading-5",
            tone === "warning"
                ? "border-destructive/40 text-destructive"
                : "border-foreground-third/20 text-foreground-third",
        )}
    >
        {children}
    </p>
);

export default ScheduleNotice;
