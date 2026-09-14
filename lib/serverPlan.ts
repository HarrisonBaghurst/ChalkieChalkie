import "server-only";

import { reportError } from "@/lib/errorResponse";
import {
    entitlementsFor,
    parsePlanId,
    parsePlanStatus,
    statusGrantsEntitlements,
} from "@/lib/plans/entitlements";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
    EntitlementDenial,
    PlanEntitlements,
    UserPlan,
} from "@/types/planTypes";
import { cache } from "react";

export const getUserPlan = cache(
    async (userId: string): Promise<UserPlan | null> => {
        const { data, error } = await supabaseAdmin
            .from("user_plans")
            .select("plan, status, trial_ends_at, current_period_end")
            .eq("user_id", userId)
            .maybeSingle();

        if (error) {
            await reportError("plan:lookup", error, undefined, userId);
            return null;
        }

        if (!data) return null;

        const plan = parsePlanId(data.plan);
        const status = parsePlanStatus(data.status);
        if (!plan || !status) return null;

        return {
            plan,
            status,
            trialEndsAt: data.trial_ends_at,
            currentPeriodEnd: data.current_period_end,
        };
    },
);

export const entitlementsForUser = async (
    userId: string,
): Promise<PlanEntitlements | null> => {
    const userPlan = await getUserPlan(userId);
    if (!userPlan || !statusGrantsEntitlements(userPlan.status)) return null;
    return entitlementsFor(userPlan.plan);
};

export const planDenial = (
    reason: EntitlementDenial,
    message: string,
    extra?: Record<string, unknown>,
): Response =>
    Response.json({ error: message, reason, ...extra }, { status: 403 });

export const requireEntitlements = async (
    userId: string,
): Promise<PlanEntitlements | Response> => {
    const entitlements = await entitlementsForUser(userId);
    if (!entitlements) {
        return planDenial(
            "no-plan",
            "This account does not have an active plan",
        );
    }
    return entitlements;
};
