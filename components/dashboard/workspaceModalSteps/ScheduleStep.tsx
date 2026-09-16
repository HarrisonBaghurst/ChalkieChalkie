import React from "react";
import DateTimePicker from "@/components/DateTimePicker";
import { formatDate } from "@/lib/textUtils";
import {
    opensImmediately,
    type StartTimeLockReason,
} from "@/lib/workspaceLifecycle";
import { WorkspaceLimits } from "@/types/planTypes";
import ScheduleNotice from "./ScheduleNotice";

type ScheduleStepProps = {
    value: Date | null;
    onChange: (value: Date | null) => void;
    limits: WorkspaceLimits | null;
    lockReason?: StartTimeLockReason | null;
};

const LOCK_COPY: Record<StartTimeLockReason, string> = {
    opened: "This workspace has already been opened, so its start time can no longer be changed. Delete the workspace if the lesson is not going ahead.",
    started: "This lesson's start time has passed, so it can no longer be changed. Delete the workspace if the lesson is not going ahead.",
};

const ScheduleStep = ({
    value,
    onChange,
    limits,
    lockReason = null,
}: ScheduleStepProps) => {
    if (lockReason) {
        return (
            <div className="flex flex-col gap-6">
                <div className="text-caption text-foreground-third">
                    Start time
                </div>
                <p className="text-small">
                    {value ? formatDate(value) : "Not set"}
                </p>
                <ScheduleNotice tone="muted">
                    {LOCK_COPY[lockReason]}
                </ScheduleNotice>
            </div>
        );
    }

    const openableNow = limits !== null && opensImmediately(value, limits);

    return (
        <div className="flex flex-col gap-6">
            <div className="text-caption text-foreground-third">Start time</div>
            <DateTimePicker value={value} onChange={onChange} />
            {!value && (
                <ScheduleNotice>
                    A workspace with no start time cannot be opened, and will be
                    deleted tonight.
                </ScheduleNotice>
            )}
            {openableNow && (
                <ScheduleNotice tone="muted">
                    This start time is inside the opening window, so you can
                    open this workspace as soon as you save.
                </ScheduleNotice>
            )}
        </div>
    );
};

export default ScheduleStep;
