import React, { useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const pad = (n: number) => String(n).padStart(2, "0");

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const QUARTER_HOURS = ["00", "15", "30", "45"];

type DateTimePickerProps = {
    value: Date | null;
    onChange: (value: Date | null) => void;
};

const DateTimePicker = ({ value, onChange }: DateTimePickerProps) => {
    const [day, setDay] = useState<Date | undefined>(value ?? undefined);
    const [hour, setHour] = useState<string | null>(
        value ? pad(value.getHours()) : null,
    );
    const [minute, setMinute] = useState<string | null>(
        value ? pad(value.getMinutes()) : null,
    );

    // Older workspaces hold arbitrary minutes; without merging the stored
    // value in, the next save would silently move the lesson.
    const minuteOptions = useMemo(() => {
        if (minute === null || QUARTER_HOURS.includes(minute)) {
            return QUARTER_HOURS;
        }
        return [...QUARTER_HOURS, minute].sort();
    }, [minute]);

    // Emitted from the handlers, not an effect on the parts, which needed a
    // deps suppression to avoid looping.
    const emit = (
        nextDay: Date | undefined,
        nextHour: string | null,
        nextMinute: string | null,
    ) => {
        if (!nextDay || nextHour === null || nextMinute === null) {
            onChange(null);
            return;
        }
        onChange(
            new Date(
                nextDay.getFullYear(),
                nextDay.getMonth(),
                nextDay.getDate(),
                Number(nextHour),
                Number(nextMinute),
            ),
        );
    };

    const handleDaySelect = (next: Date | undefined) => {
        setDay(next);
        emit(next, hour, minute);
    };

    const handleHourChange = (next: string) => {
        setHour(next);
        emit(day, next, minute);
    };

    const handleMinuteChange = (next: string) => {
        setMinute(next);
        emit(day, hour, next);
    };

    return (
        <div className="grid grid-cols-2 gap-6">
            <Calendar
                mode="single"
                selected={day}
                onSelect={handleDaySelect}
                defaultMonth={day ?? new Date()}
            />
            <div className="flex flex-col gap-2">
                <div className="text-caption text-foreground-third">TIME</div>
                <div className="flex items-center gap-2">
                    <Select value={hour ?? ""} onValueChange={handleHourChange}>
                        <SelectTrigger className="w-full" aria-label="Hour">
                            <SelectValue placeholder="Hour" />
                        </SelectTrigger>
                        <SelectContent>
                            {HOURS.map((h) => (
                                <SelectItem key={h} value={h}>
                                    {h}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="text-small text-foreground-third">:</div>
                    <Select
                        value={minute ?? ""}
                        onValueChange={handleMinuteChange}
                    >
                        <SelectTrigger className="w-full" aria-label="Minute">
                            <SelectValue placeholder="Min" />
                        </SelectTrigger>
                        <SelectContent>
                            {minuteOptions.map((m) => (
                                <SelectItem key={m} value={m}>
                                    {m}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
};

export default DateTimePicker;
