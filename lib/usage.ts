import "server-only";

import { reportError } from "@/lib/errorResponse";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
    PlanUsage,
    UsageMetric,
    UsagePeriod,
    UserPlan,
} from "@/types/planTypes";

export const WORKSPACES_CREATED: UsageMetric = "workspaces_created";

const parseInstant = (iso: string | null | undefined): Date | null => {
    if (!iso) return null;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
};

const utcDate = (date: Date): string => {
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${date.getUTCFullYear()}-${month}-${day}`;
};

const calendarMonth = (now: Date): UsagePeriod => ({
    start: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`,
    end: new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    ).toISOString(),
});

const STALE_REPORT_INTERVAL_MS = 10 * 60 * 1000;
const STALE_REPORT_CAP = 500;

const lastStaleReport = new Map<string, number>();

const shouldReportStale = (userId: string, now: number): boolean => {
    const last = lastStaleReport.get(userId);
    if (last !== undefined && now - last < STALE_REPORT_INTERVAL_MS) {
        return false;
    }

    if (lastStaleReport.size >= STALE_REPORT_CAP) lastStaleReport.clear();
    lastStaleReport.set(userId, now);
    return true;
};

export const usagePeriod = async (
    userId: string,
    userPlan: UserPlan | null,
    now: Date = new Date(),
): Promise<UsagePeriod> => {
    const start = parseInstant(userPlan?.currentPeriodStart);
    const end = parseInstant(userPlan?.currentPeriodEnd);

    if (!start || !end || end.getTime() <= start.getTime()) {
        return calendarMonth(now);
    }

    if (end.getTime() <= now.getTime()) {
        if (shouldReportStale(userId, now.getTime())) {
            await reportError(
                "usage:stale-period",
                new Error(
                    `Billing period ended ${end.toISOString()} and has not been renewed; falling back to the calendar month`,
                ),
                undefined,
                userId,
            );
        }
        return calendarMonth(now);
    }

    return { start: utcDate(start), end: end.toISOString() };
};

export type QuotaClaim =
    | { allowed: true; used: number }
    | { allowed: false; used: number };

export const claimUsage = async (
    userId: string,
    metric: UsageMetric,
    limit: number | null,
    period: UsagePeriod,
): Promise<QuotaClaim> => {
    const { data, error } = await supabaseAdmin.rpc("increment_usage", {
        p_user_id: userId,
        p_period_start: period.start,
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
    period: UsagePeriod,
): Promise<void> => {
    const { error } = await supabaseAdmin.rpc("release_usage", {
        p_user_id: userId,
        p_period_start: period.start,
        p_metric: metric,
    });

    if (error) await reportError("usage:release", error, undefined, userId);
};

export const readUsage = async (
    userId: string,
    period: UsagePeriod,
): Promise<PlanUsage> => {
    const { data, error } = await supabaseAdmin
        .from("usage_counters")
        .select("count")
        .eq("user_id", userId)
        .eq("period_start", period.start)
        .eq("metric", WORKSPACES_CREATED)
        .maybeSingle();

    if (error) await reportError("usage:read", error, undefined, userId);

    return {
        workspacesThisMonth: data?.count ?? 0,
        periodStart: period.start,
        periodEnd: period.end,
    };
};
