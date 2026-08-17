import { randomBytes } from "crypto";

// Crockford Base32, minus the confusable I/L/O/U. Exactly 32 symbols so
// 256 / 32 = 8 and `byte & 31` samples it without bias.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export const INVITE_CODE_LENGTH = 6;
export const INVITE_CODE_TTL_MS = 10 * 60 * 1000;

// Only 30 bits: guessing is bounded by the links:redeem rate limits, not by
// the code's entropy, and a hit only links the guesser to a random person.
export const INVITE_CODE_REGEX = new RegExp(`^[${ALPHABET}]{${INVITE_CODE_LENGTH}}$`);

export const generateInviteCode = (): string => {
    const bytes = randomBytes(INVITE_CODE_LENGTH);
    let code = "";
    for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
        code += ALPHABET[bytes[i] & 31];
    }
    return code;
};

// Crockford's confusable mapping, so a misread code still redeems and the
// tight redeem rate limit doesn't punish typos.
export const normaliseInviteCode = (raw: string): string =>
    raw
        .toUpperCase()
        .replace(/[\s-]/g, "")
        .replace(/[IL]/g, "1")
        .replace(/O/g, "0");
