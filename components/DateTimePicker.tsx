import React, { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

const getDaysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();

const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return (day + 6) % 7;
};

const pad = (n: number) => String(n).padStart(2, "0");

type DateTimePickerProps = {
    value: Date | null;
    onChange: (value: Date | null) => void;
};

const DateTimePicker = ({ value, onChange }: DateTimePickerProps) => {
    const now = new Date();
    const seed = value ?? now;

    const [viewYear, setViewYear] = useState(seed.getFullYear());
    const [viewMonth, setViewMonth] = useState(seed.getMonth());

    const [selectedDate, setSelectedDate] = useState<number | null>(
        value ? value.getDate() : null,
    );
    const [selectedMonth, setSelectedMonth] = useState<number | null>(
        value ? value.getMonth() : null,
    );
    const [selectedYear, setSelectedYear] = useState<number | null>(
        value ? value.getFullYear() : null,
    );
    const [selectedHour, setSelectedHour] = useState<string | null>(
        value ? pad(value.getHours()) : null,
    );
    const [selectedMin, setSelectedMin] = useState<string | null>(
        value ? pad(value.getMinutes()) : null,
    );

    const incrementMonth = (change: number) => {
        const newMonth = viewMonth + change;
        const newYear = viewYear + Math.floor(newMonth / 12);
        const normalisedMonth = ((newMonth % 12) + 12) % 12;
        setViewYear(newYear);
        setViewMonth(normalisedMonth);
    };

    const selectDate = (date: number) => {
        setSelectedDate(date);
        setSelectedMonth(viewMonth);
        setSelectedYear(viewYear);
    };

    const handleMinInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        let min = e.target.value.replace(/\D/g, "").slice(0, 2);
        if (Number(min) > 60) min = "60";
        setSelectedMin(min);
    };

    const handleHourInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        let hour = e.target.value.replace(/\D/g, "").slice(0, 2);
        if (Number(hour) > 24) hour = "24";
        setSelectedHour(hour);
    };

    useEffect(() => {
        if (
            selectedMin === null ||
            selectedMin === "" ||
            selectedHour === null ||
            selectedHour === "" ||
            selectedDate === null ||
            selectedMonth === null ||
            selectedYear === null
        ) {
            onChange(null);
            return;
        }

        const built = new Date(
            selectedYear,
            selectedMonth,
            selectedDate,
            Number(selectedHour),
            Number(selectedMin),
        );

        if (!value || built.getTime() !== value.getTime()) {
            onChange(built);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMin, selectedHour, selectedDate, selectedMonth, selectedYear]);

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
        i < firstDay ? null : i - firstDay + 1,
    );
    while (cells.length % 7 !== 0) cells.push(null);

    return (
        <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
                <div className="flex gap-4 justify-center items-center">
                    <button
                        className="relative w-6 h-6 rounded-full bg-white/5 border border-white/15 cursor-pointer flex items-center justify-center"
                        onClick={() => incrementMonth(-1)}
                    >
                        <Image
                            src={"/icons/down-arrow.svg"}
                            alt="arrow"
                            fill
                            className="rotate-90"
                        />
                    </button>
                    <div className="w-35 text-center">{`${MONTHS[viewMonth]} ${viewYear}`}</div>
                    <button
                        className="relative w-6 h-6 rounded-full bg-white/5 border border-white/15 cursor-pointer flex items-center justify-center"
                        onClick={() => incrementMonth(1)}
                    >
                        <Image
                            src={"/icons/down-arrow.svg"}
                            alt="arrow"
                            fill
                            className="rotate-270"
                        />
                    </button>
                </div>
                <div className="grid grid-cols-7">
                    {DAYS.map((day) => (
                        <div
                            key={day}
                            className="text-sm text-foreground-third w-full text-center"
                        >
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 w-full gap-2">
                    {cells.map((cell, i) =>
                        cell ? (
                            <button
                                key={i}
                                className={cn(
                                    "w-full h-8 rounded-full flex items-center justify-center cursor-pointer",
                                    selectedDate === cell &&
                                        selectedMonth === viewMonth &&
                                        selectedYear === viewYear
                                        ? "bg-[#0f348b] border-white/50"
                                        : now.getDate() === cell &&
                                            now.getMonth() === viewMonth &&
                                            now.getFullYear() === viewYear
                                          ? "border border-white/30 bg-white/2"
                                          : "bg-white/2",
                                )}
                                onClick={() => selectDate(cell)}
                            >
                                {cell}
                            </button>
                        ) : (
                            <div key={i} className="w-full h-8 rounded-full" />
                        ),
                    )}
                </div>
            </div>
            <div>
                <div className="flex gap-4 items-center justify-center">
                    <input
                        className="border border-foreground-third rounded-md w-16 h-12 text-center text-lg focus:border-white/50 outline-none appearance-none"
                        placeholder=""
                        inputMode="numeric"
                        value={selectedHour ?? ""}
                        onChange={handleHourInput}
                    />
                    <div>:</div>
                    <input
                        className="border border-foreground-third rounded-md w-16 h-12 text-center text-lg focus:border-white/50 outline-none appearance-none"
                        placeholder=""
                        inputMode="numeric"
                        value={selectedMin ?? ""}
                        onChange={handleMinInput}
                    />
                </div>
            </div>
        </div>
    );
};

export default DateTimePicker;
