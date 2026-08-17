import { INVITE_CODE_REGEX, normaliseInviteCode } from "@/lib/inviteCode";

export type RedeemBody = {
    code?: unknown;
};

export type ValidatedRedeem = {
    code: string;
};

export function validateRedeemBody(
    body: RedeemBody,
): ValidatedRedeem | Response {
    const { code } = body;

    if (typeof code !== "string" || code.trim().length === 0) {
        return new Response("Invalid code", { status: 400 });
    }

    const normalised = normaliseInviteCode(code);
    if (!INVITE_CODE_REGEX.test(normalised)) {
        return new Response("Invalid code", { status: 400 });
    }

    return { code: normalised };
}
