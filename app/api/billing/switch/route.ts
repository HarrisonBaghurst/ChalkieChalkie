import { errorResponse } from "@/lib/errorResponse";
import { claimIntent, releaseIntent } from "@/lib/plans/billingIntent";
import { statusGrantsEntitlements } from "@/lib/plans/entitlements";
import { readPlanRow } from "@/lib/plans/planRow";
import { PLAN_RANK, priceIdFor } from "@/lib/plans/stripePrices";
import { syncSubscription } from "@/lib/plans/syncSubscription";
import { enforceRateLimit } from "@/lib/ratelimit";
import { stripe } from "@/lib/stripe";
import { BillingIntentRow } from "@/types/planTypes";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { billingDenial, compedPlanDenial, planFromBody } from "../_shared";

const scheduleIdOf = (
    schedule: Stripe.Subscription["schedule"],
): string | null => {
    if (!schedule) return null;
    return typeof schedule === "string" ? schedule : schedule.id;
};

const phaseItems = (
    phase: Stripe.SubscriptionSchedule.Phase,
): Stripe.SubscriptionScheduleUpdateParams.Phase.Item[] =>
    phase.items.map((item) => ({
        price: typeof item.price === "string" ? item.price : item.price.id,
        quantity: item.quantity,
    }));

const key = (intent: BillingIntentRow, step: string): { idempotencyKey: string } => ({
    idempotencyKey: `${intent.intentId}:${step}`,
});

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorised", { status: 401 });

    const blocked = await enforceRateLimit(req, "billing:switch", userId);
    if (blocked) return blocked;

    const plan = await planFromBody(req);
    if (plan instanceof Response) return plan;

    let held: BillingIntentRow | null = null;

    try {
        const row = await readPlanRow(userId);

        const comped = compedPlanDenial(row);
        if (comped) return comped;

        if (
            !row?.stripeSubscriptionId ||
            !row.status ||
            !statusGrantsEntitlements(row.status)
        ) {
            return billingDenial(
                "no-subscription",
                "This account has no active subscription to change",
            );
        }

        if (row.plan === plan) {
            return billingDenial("same-plan", "This is already your plan");
        }

        if (!row.plan) {
            return errorResponse(
                "billing:switch",
                new Error(`Plan row for ${userId} grants but names no tier`),
                500,
                { userId },
            );
        }

        const claim = await claimIntent(userId, "switch", plan);

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
        const item = subscription.items.data[0];

        if (!item) {
            return errorResponse(
                "billing:switch",
                new Error(`Subscription ${subscription.id} has no items`),
                500,
                { userId },
            );
        }

        const price = priceIdFor(plan);
        const scheduleId = scheduleIdOf(subscription.schedule);
        const upgrade = PLAN_RANK[plan] > PLAN_RANK[row.plan];

        if (upgrade) {
            if (scheduleId) {
                await stripe.subscriptionSchedules.release(
                    scheduleId,
                    {},
                    key(held, "release"),
                );
            }

            const updated = await stripe.subscriptions.update(
                subscription.id,
                {
                    items: [{ id: item.id, price }],
                    proration_behavior: "create_prorations",
                },
                key(held, "update"),
            );

            await syncSubscription(userId, updated, null);

            return Response.json({ plan, effectiveAt: null });
        }

        const schedule = scheduleId
            ? await stripe.subscriptionSchedules.retrieve(scheduleId)
            : await stripe.subscriptionSchedules.create(
                  { from_subscription: subscription.id },
                  key(held, "schedule-create"),
              );

        const currentIndex = schedule.phases.findIndex(
            (phase) => phase.start_date === schedule.current_phase?.start_date,
        );

        const started = schedule.phases
            .slice(0, currentIndex < 0 ? 1 : currentIndex + 1)
            .map((phase) => ({
                items: phaseItems(phase),
                start_date: phase.start_date,
                end_date: phase.end_date,
            }));

        const current = started.at(-1);

        if (!current) {
            return errorResponse(
                "billing:switch",
                new Error(`Schedule ${schedule.id} has no phases`),
                500,
                { userId },
            );
        }

        await stripe.subscriptionSchedules.update(
            schedule.id,
            {
                end_behavior: "release",
                phases: [
                    ...started,
                    {
                        items: [{ price, quantity: 1 }],
                        duration: { interval: "month", interval_count: 1 },
                        proration_behavior: "none",
                    },
                ],
            },
            key(held, "schedule-update"),
        );

        const effectiveAt = new Date(current.end_date * 1000).toISOString();

        await syncSubscription(userId, subscription, {
            plan,
            at: effectiveAt,
        });

        return Response.json({ plan, effectiveAt });
    } catch (error) {
        return errorResponse("billing:switch", error, 500, { userId });
    } finally {
        if (held) await releaseIntent(held);
    }
}
