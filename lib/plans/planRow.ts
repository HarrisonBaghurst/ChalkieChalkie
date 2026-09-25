import "server-only";

import { reportError } from "@/lib/errorResponse";
import { parsePlanId, parsePlanStatus } from "@/lib/plans/entitlements";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PlanRow } from "@/types/planTypes";

export const readPlanRow = async (
    userId: string,
): Promise<PlanRow | null> => {
    const { data, error } = await supabaseAdmin
        .from("user_plans")
        .select(
            "plan, status, current_period_end, stripe_customer_id, stripe_subscription_id, pending_plan, pending_plan_at, cancels_at, reconcile_pending, updated_at, last_event_at",
        )
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        await reportError("billing:plan-row", error, undefined, userId);
        return null;
    }

    if (!data) return null;

    return {
        plan: parsePlanId(data.plan),
        status: parsePlanStatus(data.status),
        currentPeriodEnd: data.current_period_end ?? null,
        stripeCustomerId: data.stripe_customer_id ?? null,
        stripeSubscriptionId: data.stripe_subscription_id ?? null,
        pendingPlan: parsePlanId(data.pending_plan),
        pendingPlanAt: data.pending_plan_at ?? null,
        cancelsAt: data.cancels_at ?? null,
        reconcilePending: data.reconcile_pending === true,
        updatedAt: data.updated_at ?? null,
        lastEventAt: data.last_event_at ?? null,
    };
};

export const clearReconcilePending = async (userId: string): Promise<void> => {
    const { error } = await supabaseAdmin
        .from("user_plans")
        .update({ reconcile_pending: false })
        .eq("user_id", userId);

    if (error) {
        await reportError("billing:plan-row", error, undefined, userId);
    }
};

export const userIdForCustomer = async (
    customerId: string,
): Promise<string | null> => {
    const { data, error } = await supabaseAdmin
        .from("user_plans")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .limit(1);

    if (error) {
        await reportError("billing:customer-lookup", error);
        throw new Error(
            `Could not resolve an account for Stripe customer ${customerId}: ${error.message}`,
        );
    }

    return data?.[0]?.user_id ?? null;
};

export const userIdForSubscription = async (
    subscriptionId: string,
): Promise<string | null> => {
    const { data, error } = await supabaseAdmin
        .from("user_plans")
        .select("user_id")
        .eq("stripe_subscription_id", subscriptionId)
        .maybeSingle();

    if (error) {
        await reportError("billing:subscription-lookup", error);
        return null;
    }

    return data?.user_id ?? null;
};
