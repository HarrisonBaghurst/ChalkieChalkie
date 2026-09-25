export const DELETE_ACCOUNT_PHRASE = "fully delete my account";

export const matchesDeletePhrase = (value: unknown): boolean =>
    typeof value === "string" &&
    value.trim().toLowerCase() === DELETE_ACCOUNT_PHRASE;
