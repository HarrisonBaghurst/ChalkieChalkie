import "server-only";

import { isDeletedAccount } from "@/lib/deletedAccounts";
import { reportError } from "@/lib/errorResponse";
import { statusGrantsEntitlements } from "@/lib/plans/entitlements";
import {
    clearReconcilePending,
    readPlanRow,
    userIdForCustomer,
} from "@/lib/plans/planRow";
import { reconcilePlanChange } from "@/lib/plans/reconcile";
import { planForPriceId, planStatusFor } from "@/lib/plans/stripePrices";
import { invalidatePlanCache } from "@/lib/serverPlan";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
    PendingPlanChange,
    PlanId,
    PlanRow,
    PlanStatus,
} from "@/types/planTypes";
import Stripe from "stripe";

const LIVE_STRIPE_STATUSES = new Set<Stripe.Subscription.Status>([
    "active",
    "trialing",
    "past_due",
    "unpaid",
    "incomplete",
    "paused",
]);

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
    predatesRow: boolean,
): PendingColumns | null => {
    if (pending === null) return { pending_plan: null, pending_plan_at: null };

    if (pending) {
        return { pending_plan: pending.plan, pending_plan_at: pending.at };
    }

    if (!previous?.pendingPlan || predatesRow) return null;

    if (!subscription.schedule || previous.pendingPlan === plan) {
        return { pending_plan: null, pending_plan_at: null };
    }

    return null;
};

const cancelsAtOf = (
    subscription: Stripe.Subscription,
    item: Stripe.SubscriptionItem,
): string | null => {
    if (!LIVE_STRIPE_STATUSES.has(subscription.status)) return null;
    if (subscription.cancel_at) return instant(subscription.cancel_at);
    if (subscription.cancel_at_period_end) {
        return instant(item.current_period_end);
    }
    return null;
};

const supersededBy = (
    previous: PlanRow | null,
    subscription: Stripe.Subscription,
): boolean =>
    !!previous?.stripeSubscriptionId &&
    previous.stripeSubscriptionId !== subscription.id &&
    !!previous.status &&
    statusGrantsEntitlements(previous.status);

const reportSuperseded = async (
    userId: string,
    previous: PlanRow,
    subscription: Stripe.Subscription,
): Promise<void> => {
    const live = LIVE_STRIPE_STATUSES.has(subscription.status);

    await reportError(
        live ? "billing:duplicate-subscription" : "billing:stale-subscription",
        new Error(
            live
                ? `Subscription ${subscription.id} is ${subscription.status} but the plan row points at ${previous.stripeSubscriptionId}; this account is billed twice`
                : `Ignored ${subscription.status} subscription ${subscription.id}; the plan row points at ${previous.stripeSubscriptionId}`,
        ),
        undefined,
        userId,
    );
};

const predates = (
    instantIso: string | null | undefined,
    eventCreated: number | undefined,
): boolean => {
    if (typeof eventCreated !== "number" || !instantIso) return false;
    const written = Date.parse(instantIso);
    return Number.isFinite(written) && eventCreated * 1000 < written;
};

export const syncSubscription = async (
    userId: string,
    subscription: Stripe.Subscription,
    pending?: PendingPlanChange | null,
    eventCreated?: number,
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

    if (await isDeletedAccount(userId)) return null;

    const status = planStatusFor(subscription.status);
    const previous = await readPlanRow(userId);

    if (previous && supersededBy(previous, subscription)) {
        await reportSuperseded(userId, previous, subscription);
        return null;
    }

    if (predates(previous?.lastEventAt, eventCreated)) return null;

    const grantedBefore = previous?.status
        ? statusGrantsEntitlements(previous.status)
        : false;

    const changed =
        previous?.plan !== plan ||
        grantedBefore !== statusGrantsEntitlements(status);

    const { error } = await supabaseAdmin.from("user_plans").upsert(
        {
            user_id: userId,
            plan,
            status,
            trial_ends_at: instant(subscription.trial_end),
            current_period_start: instant(item.current_period_start),
            current_period_end: instant(item.current_period_end),
            cancels_at: cancelsAtOf(subscription, item),
            stripe_customer_id: customerIdOf(subscription.customer),
            stripe_subscription_id: subscription.id,
            updated_at: new Date().toISOString(),
            ...(changed ? { reconcile_pending: true } : {}),
            ...(typeof eventCreated === "number"
                ? { last_event_at: instant(eventCreated) }
                : {}),
            ...resolvePending(
                pending,
                previous,
                subscription,
                plan,
                predates(previous?.updatedAt, eventCreated),
            ),
        },
        { onConflict: "user_id" },
    );

    if (error) {
        await reportError("billing:sync", error, undefined, userId);
        throw new Error(
            `Could not write the plan row for ${userId}: ${error.message}`,
        );
    }

    await invalidatePlanCache(userId);

    if (changed || previous?.reconcilePending) {
        const summary = await reconcilePlanChange(userId);

        if (!summary.ok) {
            throw new Error(
                `Reconcile did not complete for ${userId}; the plan row stays flagged for retry`,
            );
        }

        await clearReconcilePending(userId);
    }

    return { plan, status };
};

export const revokeDeletedCustomer = async (
    customerId: string,
): Promise<void> => {
    const userId = await userIdForCustomer(customerId);
    if (!userId) return;

    const previous = await readPlanRow(userId);
    if (!previous) return;

    const granting =
        !!previous.status && statusGrantsEntitlements(previous.status);

    if (!granting && !previous.reconcilePending) return;

    if (granting) {
        await reportError(
            "billing:customer-deleted",
            new Error(
                `Stripe customer ${customerId} was deleted while the plan row still granted ${previous.plan}; revoking it`,
            ),
            undefined,
            userId,
        );

        const { error } = await supabaseAdmin
            .from("user_plans")
            .update({
                status: "cancelled",
                cancels_at: null,
                pending_plan: null,
                pending_plan_at: null,
                reconcile_pending: true,
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);

        if (error) {
            await reportError(
                "billing:customer-deleted",
                error,
                undefined,
                userId,
            );
            throw new Error(
                `Could not revoke the plan row for ${userId}: ${error.message}`,
            );
        }

        await invalidatePlanCache(userId);
    }

    const summary = await reconcilePlanChange(userId);

    if (!summary.ok) {
        throw new Error(
            `Reconcile did not complete for ${userId}; the plan row stays flagged for retry`,
        );
    }

    await clearReconcilePending(userId);
};
