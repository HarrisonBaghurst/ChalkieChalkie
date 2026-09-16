// Deterministic, so a person keeps one colour across cursor and roster in every
// session. Exported so the style guide can render the real palette.
export const USER_COLOUR_PALETTE = [
    "#f15761",
    "#f5965f",
    "#b08430",
    "#bcbd41",
    "#459f2f",
    "#46c9a3",
    "#359a9f",
    "#90d5f7",
    "#4f8bef",
    "#ada1f3",
    "#d451f0",
    "#f8b1d1",
];

export type ColourIdentity = {
    id: string;
    email?: string | null;
};

export function getUserColour(person: ColourIdentity): string {
    const key = (person.email ?? "").trim().toLowerCase() || person.id;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = (hash * 1471 + key.charCodeAt(i)) | 0;
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
