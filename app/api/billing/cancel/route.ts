import { errorResponse } from "@/lib/errorResponse";
import { claimIntent, releaseIntent } from "@/lib/plans/billingIntent";
import { statusGrantsEntitlements } from "@/lib/plans/entitlements";
import { readPlanRow } from "@/lib/plans/planRow";
import { syncSubscription } from "@/lib/plans/syncSubscription";
import { enforceRateLimit } from "@/lib/ratelimit";
import { stripe } from "@/lib/stripe";
import { BillingIntentRow } from "@/types/planTypes";
import { auth } from "@clerk/nextjs/server";
import { billingDenial, compedPlanDenial, releaseSchedule } from "../_shared";

export const maxDuration = 60;

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorised", { status: 401 });

    const blocked = await enforceRateLimit(req, "billing:cancel", userId);
    if (blocked) return blocked;

    let held: BillingIntentRow | null = null;

    try {
        const row = await readPlanRow(userId);

        const comped = compedPlanDenial(row);
        if (comped) return comped;

        if (
            !row?.stripeSubscriptionId ||
            !row.plan ||
            !row.status ||
            !statusGrantsEntitlements(row.status)
        ) {
            return billingDenial(
                "no-subscription",
                "This account has no subscription to cancel",
            );
        }

        if (row.cancelsAt) {
            return billingDenial(
                "already-cancelling",
                "This plan is already set to end",
            );
        }

        const claim = await claimIntent(userId, "switch", row.plan);

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
            await releaseSchedule(scheduleId, `${held.intentId}:release`);
        }

        const released = scheduleId
            ? await stripe.subscriptions.retrieve(row.stripeSubscriptionId)
            : subscription;

        const settled =
            released.status === "canceled" ||
            released.cancel_at_period_end ||
            released.cancel_at
                ? released
                : await stripe.subscriptions.update(
                      released.id,
                      {
                          cancel_at_period_end: true,
                          proration_behavior: "none",
                      },
                      { idempotencyKey: `${held.intentId}:cancel` },
                  );

        await syncSubscription(userId, settled, null);

        return Response.json({ plan: row.plan });
    } catch (error) {
        return errorResponse("billing:cancel", error, 500, { userId });
    } finally {
        if (held) await releaseIntent(held);
    }
}
