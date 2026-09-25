import {
    parsePlanId,
    statusGrantsEntitlements,
} from "@/lib/plans/entitlements";
import { isMissingResource, stripe } from "@/lib/stripe";
import { PlanId, PlanRow, SwitchWhen } from "@/types/planTypes";
import Stripe from "stripe";

export const billingDenial = (
    reason: string,
    message: string,
    extra?: Record<string, unknown>,
): Response =>
    Response.json({ error: message, reason, ...extra }, { status: 409 });

export const compedPlanDenial = (row: PlanRow | null): Response | null =>
    row?.plan &&
    row.status &&
    statusGrantsEntitlements(row.status) &&
    !row.stripeCustomerId
        ? billingDenial(
              "comped-plan",
              "This account's plan is set manually and cannot be changed here",
          )
        : null;

export const pastDueDenial = (row: PlanRow | null): Response | null =>
    row?.status === "past_due"
        ? billingDenial(
              "past-due",
              "This account's last payment has not gone through",
          )
        : null;

export const planFromBody = async (req: Request): Promise<PlanId | Response> => {
    let body: { plan?: unknown };

    try {
        body = (await req.json()) as { plan?: unknown };
    } catch {
        return new Response("Invalid JSON body", { status: 400 });
    }

    const plan = parsePlanId(body.plan);
    if (!plan) return new Response("Invalid plan", { status: 400 });

    return plan;
};

const UNRELEASED_SCHEDULE_STATUSES = new Set<
    Stripe.SubscriptionSchedule.Status
>(["not_started", "active"]);

export const releaseSchedule = async (
    scheduleId: string,
    idempotencyKey: string,
): Promise<void> => {
    try {
        await stripe.subscriptionSchedules.release(
            scheduleId,
            {},
            { idempotencyKey },
        );
    } catch (error) {
        if (isMissingResource(error)) return;

        const schedule =
            await stripe.subscriptionSchedules.retrieve(scheduleId);

        if (UNRELEASED_SCHEDULE_STATUSES.has(schedule.status)) throw error;
    }
};

export const clearCancellation = async (
    subscription: Stripe.Subscription,
    intentId: string,
): Promise<Stripe.Subscription> => {
    let current = subscription;

    if (current.cancel_at_period_end) {
        current = await stripe.subscriptions.update(
            current.id,
            { cancel_at_period_end: false, proration_behavior: "none" },
            { idempotencyKey: `${intentId}:uncancel` },
        );
    }

    if (current.cancel_at) {
        current = await stripe.subscriptions.update(
            current.id,
            { cancel_at: null, proration_behavior: "none" },
            { idempotencyKey: `${intentId}:clear-cancel-at` },
        );
    }

    return current;
};

export type SwitchBody = {
    plan: PlanId;
    when: SwitchWhen;
};

export const switchFromBody = async (
    req: Request,
): Promise<SwitchBody | Response> => {
    let body: { plan?: unknown; when?: unknown };

    try {
        body = (await req.json()) as { plan?: unknown; when?: unknown };
    } catch {
        return new Response("Invalid JSON body", { status: 400 });
    }

    const plan = parsePlanId(body.plan);
    if (!plan) return new Response("Invalid plan", { status: 400 });

    const when = body.when;

    if (when !== undefined && when !== "now" && when !== "period-end") {
        return new Response("Invalid when", { status: 400 });
    }

    return { plan, when: when === "now" ? "now" : "period-end" };
};
