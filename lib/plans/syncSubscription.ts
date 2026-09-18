import "server-only";

import { reportError } from "@/lib/errorResponse";
import { statusGrantsEntitlements } from "@/lib/plans/entitlements";
import { readPlanRow } from "@/lib/plans/planRow";
import { reconcilePlanChange } from "@/lib/plans/reconcile";
import { planForPriceId, planStatusFor } from "@/lib/plans/stripePrices";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
    PendingPlanChange,
    PlanId,
    PlanRow,
    PlanStatus,
} from "@/types/planTypes";
import Stripe from "stripe";

const instant = (seconds: number | null | undefined): string | null =>
    typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null;

const customerIdOf = (
    customer: Stripe.Subscription["customer"],
): string | null => (typeof customer === "string" ? customer : customer.id);

export type SyncResult = {
    plan: PlanId;
    status: PlanStatus;
};

type PendingColumns = {
    pending_plan: PlanId | null;
    pending_plan_at: string | null;
};

const resolvePending = (
    pending: PendingPlanChange | null | undefined,
    previous: PlanRow | null,
    subscription: Stripe.Subscription,
    plan: PlanId,
): PendingColumns | null => {
    if (pending === null) return { pending_plan: null, pending_plan_at: null };

    if (pending) {
        return { pending_plan: pending.plan, pending_plan_at: pending.at };
    }

    if (!previous?.pendingPlan) return null;

    if (!subscription.schedule || previous.pendingPlan === plan) {
        return { pending_plan: null, pending_plan_at: null };
    }

    return null;
};

export const syncSubscription = async (
    userId: string,
    subscription: Stripe.Subscription,
    pending?: PendingPlanChange | null,
): Promise<SyncResult | null> => {
    const item = subscription.items.data[0];

    if (!item) {
        await reportError(
            "billing:sync",
            new Error(`Subscription ${subscription.id} has no items`),
            undefined,
            userId,
        );
        return null;
    }

    const plan = planForPriceId(item.price.id);

    if (!plan) {
        await reportError(
            "billing:sync",
            new Error(`Unknown Stripe price ${item.price.id}`),
            undefined,
            userId,
        );
        return null;
    }

    const status = planStatusFor(subscription.status);
    const previous = await readPlanRow(userId);

    if (
        previous?.stripeSubscriptionId &&
        previous.stripeSubscriptionId !== subscription.id &&
        previous.status &&
        statusGrantsEntitlements(previous.status)
    ) {
        return null;
    }

    const { error } = await supabaseAdmin.from("user_plans").upsert(
        {
            user_id: userId,
            plan,
            status,
            trial_ends_at: instant(subscription.trial_end),
            current_period_start: instant(item.current_period_start),
            current_period_end: instant(item.current_period_end),
            stripe_customer_id: customerIdOf(subscription.customer),
            stripe_subscription_id: subscription.id,
            updated_at: new Date().toISOString(),
            ...resolvePending(pending, previous, subscription, plan),
        },
        { onConflict: "user_id" },
    );

    if (error) {
        await reportError("billing:sync", error, undefined, userId);
        throw new Error(
            `Could not write the plan row for ${userId}: ${error.message}`,
        );
    }

    const grantedBefore = previous?.status
        ? statusGrantsEntitlements(previous.status)
        : false;

    const changed =
        previous?.plan !== plan ||
        grantedBefore !== statusGrantsEntitlements(status);

    if (changed) await reconcilePlanChange(userId);

    return { plan, status };
};
