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
            "plan, status, stripe_customer_id, stripe_subscription_id, pending_plan, pending_plan_at",
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
        stripeCustomerId: data.stripe_customer_id ?? null,
        stripeSubscriptionId: data.stripe_subscription_id ?? null,
        pendingPlan: parsePlanId(data.pending_plan),
        pendingPlanAt: data.pending_plan_at ?? null,
    };
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
