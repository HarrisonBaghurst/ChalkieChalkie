import { errorResponse } from "@/lib/errorResponse";
import { claimIntent, releaseIntent } from "@/lib/plans/billingIntent";
import { readPlanRow } from "@/lib/plans/planRow";
import { syncSubscription } from "@/lib/plans/syncSubscription";
import { enforceRateLimit } from "@/lib/ratelimit";
import { stripe } from "@/lib/stripe";
import { BillingIntentRow } from "@/types/planTypes";
import { auth } from "@clerk/nextjs/server";
import { billingDenial } from "../_shared";

export async function DELETE(req: Request) {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorised", { status: 401 });

    const blocked = await enforceRateLimit(req, "billing:switch", userId);
    if (blocked) return blocked;

    let held: BillingIntentRow | null = null;

    try {
        const row = await readPlanRow(userId);

        if (!row?.stripeSubscriptionId || !row.pendingPlan) {
            return billingDenial(
                "no-pending-change",
                "There is no scheduled plan change to cancel",
            );
        }

        const claim = await claimIntent(userId, "switch", row.pendingPlan);

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

        const subscription = await stripe.subscriptions.retrieve(
            row.stripeSubscriptionId,
        );

        const schedule = subscription.schedule;
        const scheduleId =
            typeof schedule === "string" ? schedule : (schedule?.id ?? null);

        if (scheduleId) {
            await stripe.subscriptionSchedules.release(
                scheduleId,
                {},
                { idempotencyKey: `${held.intentId}:release` },
            );
        }

        await syncSubscription(userId, subscription, null);

        return Response.json({ plan: row.plan });
    } catch (error) {
        return errorResponse("billing:pending", error, 500, { userId });
    } finally {
        if (held) await releaseIntent(held);
    }
}
