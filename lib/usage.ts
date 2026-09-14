import "server-only";

import { reportError } from "@/lib/errorResponse";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PlanUsage, UsageMetric } from "@/types/planTypes";

export const WORKSPACES_CREATED: UsageMetric = "workspaces_created";

export const periodStart = (now: Date = new Date()): string => {
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    return `${now.getUTCFullYear()}-${month}-01`;
};

export const periodEnd = (now: Date = new Date()): string =>
    new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    ).toISOString();

export type QuotaClaim =
    | { allowed: true; used: number }
    | { allowed: false; used: number };

export const claimUsage = async (
    userId: string,
    metric: UsageMetric,
    limit: number | null,
    now: Date = new Date(),
): Promise<QuotaClaim> => {
    const { data, error } = await supabaseAdmin.rpc("increment_usage", {
        p_user_id: userId,
        p_period_start: periodStart(now),
        p_metric: metric,
        p_limit: limit,
    });

    if (error) {
        await reportError("usage:claim", error, undefined, userId);
        return { allowed: false, used: 0 };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { allowed: false, used: 0 };

    return row.allowed
        ? { allowed: true, used: row.used }
        : { allowed: false, used: row.used };
};

export const releaseUsage = async (
    userId: string,
    metric: UsageMetric,
    now: Date = new Date(),
): Promise<void> => {
    const { error } = await supabaseAdmin.rpc("release_usage", {
        p_user_id: userId,
        p_period_start: periodStart(now),
        p_metric: metric,
    });

    if (error) await reportError("usage:release", error, undefined, userId);
};

export const readUsage = async (
    userId: string,
    now: Date = new Date(),
): Promise<PlanUsage> => {
    const start = periodStart(now);

    const { data, error } = await supabaseAdmin
        .from("usage_counters")
        .select("count")
        .eq("user_id", userId)
        .eq("period_start", start)
        .eq("metric", WORKSPACES_CREATED)
        .maybeSingle();

    if (error) await reportError("usage:read", error, undefined, userId);

    return {
        workspacesThisMonth: data?.count ?? 0,
        periodStart: start,
        periodEnd: periodEnd(now),
    };
};
