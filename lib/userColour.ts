import { _layout, type BlobatarOptions, type Expression } from "blobatar";
import { surprised } from "blobatar/expression";
import { blobatarUri } from "blobatar/uri";

const INK_FREE_TONES = Array.from({ length: 93 }, (_, i) => i / 100);

const BLOBATAR_OPTIONS: BlobatarOptions = {
    normalize: false,
    traits: { tone: INK_FREE_TONES },
};

export type ColourIdentity = {
    id: string;
};

export const UNNAMED_USER = "Unnamed user";

const colourCache = new Map<string, string>();
const blobatarCache = new Map<Expression, Map<string, string>>();

function getUserKey(person: ColourIdentity): string {
    return person.id.replace(/^user_/, "");
}

export function getUserColour(person: ColourIdentity): string {
    const key = getUserKey(person);
    let colour = colourCache.get(key);
    if (colour === undefined) {
        colour = _layout(key, BLOBATAR_OPTIONS).palette.head!;
        colourCache.set(key, colour);
    }
    return colour;
}

export function getUserBlobatar(
    person: ColourIdentity,
    expression: Expression = surprised,
): string {
    const key = getUserKey(person);
    let cache = blobatarCache.get(expression);
    if (cache === undefined) {
        cache = new Map();
        blobatarCache.set(expression, cache);
    }
    let uri = cache.get(key);
    if (uri === undefined) {
        uri = blobatarUri(key, { ...BLOBATAR_OPTIONS, expression });
        cache.set(key, uri);
    }
    return uri;
}

export function getFullName(person: {
    firstName?: string | null;
    lastName?: string | null;
}): string {
    return `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim();
}
