import React from "react";
import DateTimePicker from "@/components/DateTimePicker";
import { formatDate } from "@/lib/textUtils";

type ScheduleStepProps = {
    value: Date | null;
    onChange: (value: Date | null) => void;
};

const ScheduleStep = ({ value, onChange }: ScheduleStepProps) => {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <div className="text-caption text-foreground-third">
                        START TIME
                    </div>
                </div>
            </div>
            <DateTimePicker value={value} onChange={onChange} />
        </div>
    );
};

export default ScheduleStep;
