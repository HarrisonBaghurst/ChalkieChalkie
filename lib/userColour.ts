// Deterministic, so a person keeps one colour across cursor and roster in every
// session. Exported so the style guide can render the real palette.
export const USER_COLOUR_PALETTE = [
    "#f7a3a9",
    "#f4a988",
    "#e4b572",
    "#c7c274",
    "#a2cd8b",
    "#7cd2ae",
    "#65d2d2",
    "#70ccee",
    "#92c1fd",
    "#b7b5fc",
    "#d6aaea",
    "#eda4cc",
    "#f6838e",
    "#f28c5c",
    "#de9c31",
    "#b8af33",
    "#83be60",
    "#37c695",
    "#00c3c3",
    "#02bced",
    "#6dadff",
    "#a29dff",
    "#cc8ee7",
    "#e885bf",
    "#e66575",
    "#e37035",
    "#c78600",
    "#a39900",
    "#67aa3a",
    "#00b07f",
    "#00abab",
    "#00a4d0",
    "#4996f5",
    "#8d84f2",
    "#ba73d8",
    "#d868ab",
    "#d05a69",
    "#cd632d",
    "#b37900",
    "#938a00",
    "#5c9932",
    "#009e72",
    "#009a9a",
    "#0094bb",
    "#4087de",
    "#7f76dc",
    "#a867c3",
    "#c35c9b",
];

export function getUserColour(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash * 31 + id.charCodeAt(i)) | 0;
    }
    const index = Math.abs(hash) % USER_COLOUR_PALETTE.length;
    return USER_COLOUR_PALETTE[index];
}

export function getUserInitials(
    firstName?: string | null,
    lastName?: string | null,
): string {
    const first = (firstName ?? "").trim().charAt(0);
    const last = (lastName ?? "").trim().charAt(0);
    const initials = `${first}${last}`.toUpperCase();
    return initials || "?";
}

export function getFullName(person: {
    firstName?: string | null;
    lastName?: string | null;
}): string {
    return `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim();
}
