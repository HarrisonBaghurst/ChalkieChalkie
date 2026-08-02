import { randomBytes } from "crypto";

// Crockford Base32: 32 symbols, excludes the visually confusable I, L, O, U.
// 32 symbols (not 30) matters beyond readability — 256 / 32 = 8 exactly, so a
// random byte maps onto the alphabet with zero bias and no rejection sampling
// is needed (`byte & 31`).
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export const INVITE_CODE_LENGTH = 6;
export const INVITE_CODE_TTL_MS = 10 * 60 * 1000;

// 32^6 = 2^30 (30 bits). Security here comes from rate limit × live-code
// population, not the code's raw entropy: even with an implausible 1000 codes
// live at once, the "links:redeem" limit (5 attempts/10 min/user) plus its IP
// twin (20/hour) bound a guesser to roughly one successful hit per account
// every several years, and a lucky hit only links the guesser to a random
// person, who sees the new row immediately with a Remove action. Going to 8
// characters would roughly double the entropy at a real cost to typing
// accuracy, for a security margin the rate limit already provides.
export const INVITE_CODE_REGEX = new RegExp(`^[${ALPHABET}]{${INVITE_CODE_LENGTH}}$`);

export const generateInviteCode = (): string => {
    const bytes = randomBytes(INVITE_CODE_LENGTH);
    let code = "";
    for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
        code += ALPHABET[bytes[i] & 31];
    }
    return code;
};

// Uppercases, strips whitespace and hyphens, then applies Crockford's
// confusable mapping (I, L -> 1; O -> 0) so a code that reads ambiguously off
// a screen still redeems. This is what lets the redemption rate limit stay as
// tight as 5 attempts/10 minutes without punishing typos.
export const normaliseInviteCode = (raw: string): string =>
    raw
        .toUpperCase()
        .replace(/[\s-]/g, "")
        .replace(/[IL]/g, "1")
        .replace(/O/g, "0");
