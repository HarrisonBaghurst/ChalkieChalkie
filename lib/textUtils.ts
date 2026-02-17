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
