export function getLastEditedText(inputDate: Date): string {
    const date = new Date(inputDate);
    const now = new Date();

    const diff = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diff / 1000);

    if (diffSeconds < 60) {
        return `Last opened ${diffSeconds} second${diffSeconds !== 1 ? "s" : ""} ago`;
    }

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
        return `Last opened ${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
        return `Last opened ${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
        return `Last opened ${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    }

    const diffWeeks = Math.floor(diffDays / 7);
    return `Last opened ${diffWeeks} week${diffWeeks !== 1 ? "s" : ""} ago`;
}

const SHORT_MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

const WEEKDAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

const startOfDay = (d: Date): number => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
};

export function formatSessionTime(iso: string): string {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";

    const time = date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
    });

    const now = new Date();
    const dayDiff = Math.round(
        (startOfDay(date) - startOfDay(now)) / (24 * 60 * 60 * 1000),
    );

    if (dayDiff === 0) return `Today ${time}`;
    if (dayDiff === 1) return `Tomorrow ${time}`;
    if (dayDiff === -1) return `Yesterday ${time}`;
    if (dayDiff > -7 && dayDiff < 7) return `${WEEKDAYS[date.getDay()]} ${time}`;

    const day = date.getDate();
    const month = SHORT_MONTHS[date.getMonth()];
    const year =
        date.getFullYear() === now.getFullYear() ? "" : ` ${date.getFullYear()}`;
    return `${day} ${month}${year} ${time}`;
}

export const formatDate = (date: Date): string => {
    const day = date.toLocaleDateString("en-GB", { weekday: "long" });
    const dayNum = date.getDate();
    const month = date.toLocaleDateString("en-GB", { month: "long" });
    const time = date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
    });
    const suffix =
        dayNum % 10 === 1 && dayNum !== 11
            ? "st"
            : dayNum % 10 === 2 && dayNum !== 12
              ? "nd"
              : dayNum % 10 === 3 && dayNum !== 13
                ? "rd"
                : "th";
    return `${day} ${dayNum}${suffix} ${month} - ${time}`;
};
