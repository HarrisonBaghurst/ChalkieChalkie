import { matchesDeletePhrase } from "@/lib/accountDeletion";
import { cancelAllSubscriptions, deleteAccountData } from "@/lib/deleteAccount";
import { errorResponse } from "@/lib/errorResponse";
import { claimIntent, releaseIntent } from "@/lib/plans/billingIntent";
import { readPlanRow } from "@/lib/plans/planRow";
import { enforceRateLimit } from "@/lib/ratelimit";
import { isAdmin } from "@/lib/serverRole";
import { BillingIntentRow } from "@/types/planTypes";
import { auth, reverificationErrorResponse } from "@clerk/nextjs/server";
import { billingDenial } from "../billing/_shared";

export const maxDuration = 60;

export async function DELETE(req: Request) {
    const { userId, has } = await auth();
    if (!userId) {
        return Response.json({ error: "Unauthorised" }, { status: 401 });
    }

    if (isAdmin(userId)) {
        return Response.json(
            { error: "Admin accounts cannot be deleted here", reason: "admin" },
            { status: 403 },
        );
    }

    if (!has({ reverification: "strict" })) {
        return reverificationErrorResponse("strict");
    }

    const blocked = await enforceRateLimit(req, "account:delete", userId);
    if (blocked) return blocked;

    let body: { confirmation?: unknown };

    try {
        body = (await req.json()) as { confirmation?: unknown };
    } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!matchesDeletePhrase(body.confirmation)) {
        return billingDenial(
            "confirmation",
            "The confirmation phrase did not match",
        );
    }

    let held: BillingIntentRow | null = null;

    try {
        const row = await readPlanRow(userId);
        const claim = await claimIntent(userId, "switch", row?.plan ?? "basic");

        if (!claim.owned) {
            return billingDenial(
                claim.intent.kind === "checkout"
                    ? "checkout-pending"
                    : "change-in-progress",
                claim.intent.kind === "checkout"
                    ? "A payment for this account is already going through"
                    : "A plan change for this account is already going through",
            );
        }

        held = claim.intent;

        await cancelAllSubscriptions(userId, held.intentId);
        await deleteAccountData(userId);

        held = null;

        return Response.json({ deleted: true });
    } catch (error) {
        return errorResponse("account:delete", error, 500, {
            userId,
            publicMessage: "Your account could not be fully deleted",
        });
    } finally {
        if (held) await releaseIntent(held);
    }
}
