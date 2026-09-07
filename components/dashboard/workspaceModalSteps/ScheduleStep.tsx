import React from "react";
import DateTimePicker from "@/components/DateTimePicker";
import { formatDate } from "@/lib/textUtils";
import { limitsForPlan, opensWithinLockWindow } from "@/lib/workspaceLifecycle";
import ScheduleNotice from "./ScheduleNotice";

type ScheduleStepProps = {
    value: Date | null;
    onChange: (value: Date | null) => void;
    locked?: boolean;
};

const ScheduleStep = ({
    value,
    onChange,
    locked = false,
}: ScheduleStepProps) => {
    if (locked) {
        return (
            <div className="flex flex-col gap-6">
                <div className="text-caption text-foreground-third">
                    START TIME
                </div>
                <p className="text-small">
                    {value ? formatDate(value) : "Not set"}
                </p>
                <ScheduleNotice tone="muted">
                    This workspace has already opened, so its start time can no
                    longer be changed. Delete the workspace if the lesson is not
                    going ahead.
                </ScheduleNotice>
            </div>
        );
    }

    const opensImmediately = opensWithinLockWindow(value, limitsForPlan());

    return (
        <div className="flex flex-col gap-6">
            <div className="text-caption text-foreground-third">START TIME</div>
            <DateTimePicker value={value} onChange={onChange} />
            {!value && (
                <ScheduleNotice>
                    A workspace with no start time cannot be opened, and will be
                    deleted tonight.
                </ScheduleNotice>
            )}
            {opensImmediately && (
                <ScheduleNotice>
                    This start time is already inside the opening window, so the
                    workspace opens immediately and its start time will be
                    locked as soon as you save.
                </ScheduleNotice>
            )}
        </div>
    );
};

export default ScheduleStep;
