import "server-only";

import { reportError } from "@/lib/errorResponse";
import { redis } from "@/lib/ratelimit";
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
    PlanId,
    UserPlan,
} from "@/types/planTypes";
import { cache } from "react";

const PLAN_CACHE_TTL_SECONDS = 5 * 60;

const planCacheKey = (userId: string): string => `chalkie:plan:${userId}`;

type CachedPlan = { plan: UserPlan | null };

type PlanRead = { ok: true; plan: UserPlan | null } | { ok: false };

const readPlanFromDatabase = async (userId: string): Promise<PlanRead> => {
    const { data, error } = await supabaseAdmin
        .from("user_plans")
        .select(
            "plan, status, trial_ends_at, current_period_start, current_period_end",
        )
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        await reportError("plan:lookup", error, undefined, userId);
        return { ok: false };
    }

    if (!data) return { ok: true, plan: null };

    const plan = parsePlanId(data.plan);
    const status = parsePlanStatus(data.status);
    if (!plan || !status) return { ok: true, plan: null };

    return {
        ok: true,
        plan: {
            plan,
            status,
            trialEndsAt: data.trial_ends_at,
            currentPeriodStart: data.current_period_start,
            currentPeriodEnd: data.current_period_end,
        },
    };
};

const readCachedPlan = async (userId: string): Promise<CachedPlan | null> => {
    try {
        return await redis.get<CachedPlan>(planCacheKey(userId));
    } catch (err) {
        await reportError("plan:cache:read", err, undefined, userId);
        return null;
    }
};

const writeCachedPlan = async (
    userId: string,
    plan: UserPlan | null,
): Promise<void> => {
    try {
        await redis.set<CachedPlan>(
            planCacheKey(userId),
            { plan },
            { ex: PLAN_CACHE_TTL_SECONDS },
        );
    } catch (err) {
        await reportError("plan:cache:write", err, undefined, userId);
    }
};

export const invalidatePlanCache = async (userId: string): Promise<void> => {
    try {
        await redis.del(planCacheKey(userId));
    } catch (err) {
        await reportError("plan:cache:invalidate", err, undefined, userId);
    }
};

export const readUserPlanFresh = async (
    userId: string,
): Promise<UserPlan | null> => {
    const read = await readPlanFromDatabase(userId);
    return read.ok ? read.plan : null;
};

export const getUserPlan = cache(
    async (userId: string): Promise<UserPlan | null> => {
        const cached = await readCachedPlan(userId);
        if (cached) return cached.plan;

        const read = await readPlanFromDatabase(userId);
        if (!read.ok) return null;

        await writeCachedPlan(userId, read.plan);
        return read.plan;
    },
);

export const entitlementsForUser = async (
    userId: string,
): Promise<PlanEntitlements | null> => {
    const userPlan = await getUserPlan(userId);
    if (!userPlan || !statusGrantsEntitlements(userPlan.status)) return null;
    return entitlementsFor(userPlan.plan);
};

export const grantedPlanForUser = async (
    userId: string,
): Promise<PlanId | null> => {
    const userPlan = await getUserPlan(userId);
    if (!userPlan || !statusGrantsEntitlements(userPlan.status)) return null;
    return userPlan.plan;
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
