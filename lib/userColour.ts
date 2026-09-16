// Deterministic, so a person keeps one colour across cursor and roster in every
// session. Exported so the style guide can render the real palette.
export const USER_COLOUR_PALETTE = [
    "#a39900",
    "#f4a988",
    "#b7b5fc",
    "#0094bb",
    "#7cd2ae",
    "#ba73d8",
    "#de9c31",
    "#5c9932",
    "#00abab",
    "#6dadff",
    "#f28c5c",
    "#938a00",
    "#c35c9b",
    "#00c3c3",
    "#a29dff",
    "#67aa3a",
    "#e4b572",
    "#65d2d2",
    "#a867c3",
    "#d6aaea",
    "#d05a69",
    "#009a9a",
    "#8d84f2",
    "#92c1fd",
    "#f7a3a9",
    "#b8af33",
    "#cd632d",
    "#7f76dc",
    "#f6838e",
    "#02bced",
    "#00b07f",
    "#b37900",
    "#a2cd8b",
    "#e885bf",
    "#4996f5",
    "#e37035",
    "#009e72",
    "#c7c274",
    "#d868ab",
    "#70ccee",
    "#eda4cc",
    "#83be60",
    "#4087de",
    "#c78600",
    "#cc8ee7",
    "#37c695",
    "#e66575",
    "#00a4d0",
];

export type ColourIdentity = {
    id: string;
    email?: string | null;
};

export function getUserColour(person: ColourIdentity): string {
    const key = (person.email ?? "").trim().toLowerCase() || person.id;
    let hash = 0x811c9dc5 | 0;
    for (let i = 0; i < key.length; i++) {
        hash ^= key.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x85ebca6b);
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0xc2b2ae35);
    hash ^= hash >>> 16;
    const index = (hash >>> 0) % USER_COLOUR_PALETTE.length;
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
