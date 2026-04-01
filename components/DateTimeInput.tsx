import React, { useEffect, useState } from "react";
import Button from "./Button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { formatDate } from "@/lib/textUtils";

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
    // Remap Sunday (0) to 6, Monday (1) to 0, etc.
    return (day + 6) % 7;
};

type DateTimeInputProps = {
    setTime: Date | null;
    onChange: (value: Date) => void;
};

const DateTimeInput = ({ setTime, onChange }: DateTimeInputProps) => {
    const now = new Date();
    const [popupOpen, setPopupOpen] = useState(false);
    const [updatedStart, setUpdatedStart] = useState<Date | null>(null);
    const [viewYear, setViewYear] = useState((setTime ?? now).getFullYear());
    const [viewMonth, setViewMonth] = useState((setTime ?? now).getMonth());

    const [selectedDate, setSelectedDate] = useState<number | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const [selectedYear, setSelectedYear] = useState<number | null>(null);

    const [selectedMin, setSelectedMin] = useState<string | null>(null);
    const [selectedHour, setSelectedHour] = useState<string | null>(null);

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

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
        i < firstDay ? null : i - firstDay + 1,
    );
    while (cells.length % 7 !== 0) cells.push(null);

    const handleMinInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        let min = e.target.value;

        // strip non-numeric charcters
        min = min.replace(/\D/g, "");

        min = min.slice(0, 2);

        if (Number(min) > 60) {
            min = "60";
        }

        setSelectedMin(min);
    };

    const handleHourInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        let hour = e.target.value;

        // strip non-numeric charcters
        hour = hour.replace(/\D/g, "");

        hour = hour.slice(0, 2);

        if (Number(hour) > 24) {
            hour = "24";
        }

        setSelectedHour(hour);
    };

    useEffect(() => {
        if (
            !selectedMin ||
            !selectedHour ||
            !selectedDate ||
            !selectedMonth ||
            !selectedYear
        ) {
            setUpdatedStart(null);
            return;
        }

        const updated = new Date(
            selectedYear,
            selectedMonth,
            selectedDate,
            Number(selectedHour),
            Number(selectedMin),
        );
        setUpdatedStart(updated);
    }, [selectedMin, selectedHour, selectedDate, selectedMonth, selectedYear]);

    return (
        <div>
            <div onClick={() => setPopupOpen(true)}>
                {setTime ? formatDate(setTime) : "Start time not set"}
            </div>
            {popupOpen && (
                <div
                    onClick={() => setPopupOpen(false)}
                    className="fixed left-0 top-0 w-full h-full bg-background/80 z-500"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-1/2 top-1/2 w-[40%] h-[65%] bg-[#151512] rounded-2xl border border-white/15 -translate-x-1/2 -translate-y-1/2 px-8 py-5"
                    >
                        <div className="flex flex-col justify-between h-full">
                            <div className="flex flex-col gap-8">
                                <div className="font-poppins-bold text-foreground text-2xl">
                                    Change start date
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <div className="text-sm text-foreground-third">
                                            PREVIOUS
                                        </div>
                                        <div>
                                            {setTime
                                                ? formatDate(setTime)
                                                : "Start time not set"}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="text-sm text-foreground-third">
                                            UPDATED
                                        </div>
                                        <div className="">
                                            {updatedStart
                                                ? formatDate(updatedStart)
                                                : "Fill in all fields to update"}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-12 grid grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-4">
                                        <div className="flex gap-4 justify-center items-center">
                                            <button
                                                className="relative w-6 h-6 rounded-full bg-white/5 border border-white/15 cursor-pointer flex items-center justify-center"
                                                onClick={() =>
                                                    incrementMonth(-1)
                                                }
                                            >
                                                <Image
                                                    src={
                                                        "/icons/down-arrow.svg"
                                                    }
                                                    alt="arrow"
                                                    fill
                                                    className="rotate-90"
                                                />
                                            </button>
                                            <div className="w-35 text-center">{`${MONTHS[viewMonth]} ${viewYear}`}</div>
                                            <button
                                                className="relative w-6 h-6 rounded-full bg-white/5 border border-white/15 cursor-pointer flex items-center justify-center"
                                                onClick={() =>
                                                    incrementMonth(1)
                                                }
                                            >
                                                <Image
                                                    src={
                                                        "/icons/down-arrow.svg"
                                                    }
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
                                                            selectedDate ===
                                                                cell &&
                                                                selectedMonth ===
                                                                    viewMonth &&
                                                                selectedYear ===
                                                                    viewYear
                                                                ? "bg-[#0f348b] border-white/50"
                                                                : now.getDate() ===
                                                                        cell &&
                                                                    now.getMonth() ===
                                                                        viewMonth &&
                                                                    now.getFullYear() ===
                                                                        viewYear
                                                                  ? "border border-white/30 bg-white/2"
                                                                  : "bg-white/2",
                                                        )}
                                                        onClick={() =>
                                                            selectDate(cell)
                                                        }
                                                    >
                                                        {cell}
                                                    </button>
                                                ) : (
                                                    <div
                                                        key={i}
                                                        className="w-full h-8 rounded-full"
                                                    />
                                                ),
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex gap-4 items-center justify-center">
                                            <input
                                                className="border-2 border-white/15 rounded-md w-16 h-12 text-center text-lg focus:border-white/50 outline-none appearance-none"
                                                placeholder=""
                                                inputMode="numeric"
                                                value={
                                                    selectedHour
                                                        ? selectedHour
                                                        : ""
                                                }
                                                onChange={handleHourInput}
                                            />{" "}
                                            <div>:</div>
                                            <input
                                                className="border-2 border-white/15 rounded-md w-16 h-12 text-center text-lg focus:border-white/50 outline-none appearance-none"
                                                placeholder=""
                                                inputMode="numeric"
                                                value={
                                                    selectedMin
                                                        ? selectedMin
                                                        : ""
                                                }
                                                onChange={handleMinInput}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-6 w-full">
                                <Button
                                    text="Discard changes"
                                    handleClick={() => setPopupOpen(false)}
                                    variant="secondary"
                                    size="large"
                                    className="w-full"
                                />
                                <Button
                                    text="Update start time"
                                    handleClick={() => {
                                        if (updatedStart) {
                                            onChange(updatedStart);
                                        }
                                        setPopupOpen(false);
                                    }}
                                    variant="primary"
                                    size="large"
                                    className="w-full"
                                    clickable={updatedStart ? true : false}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DateTimeInput;
