import { DASHBOARD_GRACE_MS } from "@/lib/dashboardFilters";
import { daysUntil, formatTimeUntil } from "@/lib/textUtils";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type WorkspacePlan = "free";

export type WorkspaceLimits = {
    leadMs: number;
    retentionMs: number;
};

const PLAN_LIMITS: Record<WorkspacePlan, WorkspaceLimits> = {
    free: { leadMs: HOUR_MS, retentionMs: 14 * DAY_MS },
};

const DEFAULT_PLAN: WorkspacePlan = "free";

export const limitsForPlan = (plan?: WorkspacePlan | null): WorkspaceLimits =>
    PLAN_LIMITS[plan ?? DEFAULT_PLAN] ?? PLAN_LIMITS[DEFAULT_PLAN];

const parseInstant = (iso: string | null | undefined): number | null => {
    if (!iso) return null;
    const time = new Date(iso).getTime();
    return Number.isNaN(time) ? null : time;
};

export const sameInstant = (
    a: string | null | undefined,
    b: string | null | undefined,
): boolean => parseInstant(a) === parseInstant(b);

export type ScheduleWindow = {
    opensAt: string | null;
    expiresAt: string;
};

export const scheduleWindow = (
    startTime: string | null,
    limits: WorkspaceLimits,
    now: number = Date.now(),
): ScheduleWindow => {
    const start = parseInstant(startTime);
    if (start === null) {
        return { opensAt: null, expiresAt: new Date(now).toISOString() };
    }
    return {
        opensAt: new Date(start - limits.leadMs).toISOString(),
        expiresAt: new Date(start + limits.retentionMs).toISOString(),
    };
};

export type AccessDenial = "unscheduled" | "not-open" | "expired";

export const boardAccessDenial = (
    opensAt: string | null,
    expiresAt: string | null,
    now: number = Date.now(),
): AccessDenial | null => {
    const opens = parseInstant(opensAt);
    if (opens === null) return "unscheduled";
    if (now < opens) return "not-open";

    const expires = parseInstant(expiresAt);
    if (expires !== null && now >= expires) return "expired";

    return null;
};

export const isStartTimeLocked = (
    opensAt: string | null | undefined,
    now: number = Date.now(),
): boolean => {
    const opens = parseInstant(opensAt);
    return opens !== null && now >= opens;
};

export const opensWithinLockWindow = (
    startTime: Date | null,
    limits: WorkspaceLimits,
    now: number = Date.now(),
): boolean =>
    startTime !== null && startTime.getTime() - limits.leadMs <= now;

export type LifecyclePhase =
    | "unscheduled"
    | "scheduled"
    | "open"
    | "past"
    | "expired";

export type LifecycleFields = {
    startTime: string | null;
    opensAt: string | null;
    expiresAt: string | null;
};

export const lifecyclePhase = (
    workspace: LifecycleFields,
    now: number = Date.now(),
): LifecyclePhase => {
    const opens = parseInstant(workspace.opensAt);
    if (opens === null) return "unscheduled";

    const expires = parseInstant(workspace.expiresAt);
    if (expires !== null && now >= expires) return "expired";

    if (now < opens) return "scheduled";

    const start = parseInstant(workspace.startTime);
    if (start !== null && now >= start + DASHBOARD_GRACE_MS) return "past";

    return "open";
};

export type LifecycleStatus = {
    phase: LifecyclePhase;
    label: string;
    dotClass: string;
};

const deletionLabel = (expiresAt: string | null): string => {
    const days = expiresAt ? daysUntil(expiresAt) : 0;
    if (days <= 0) return "Deletes tonight";
    return `Deletes in ${days} day${days !== 1 ? "s" : ""}`;
};

export const lifecycleStatus = (
    workspace: LifecycleFields,
    now: number = Date.now(),
): LifecycleStatus => {
    const phase = lifecyclePhase(workspace, now);

    switch (phase) {
        case "unscheduled":
            return {
                phase,
                label: "Unscheduled",
                dotClass: "bg-destructive",
            };
        case "scheduled":
            return {
                phase,
                label: `Opens ${formatTimeUntil(workspace.opensAt ?? "", now)}`,
                dotClass: "bg-amber-400",
            };
        case "open":
            return { phase, label: "Ready", dotClass: "bg-green-500" };
        case "past": {
            const days = workspace.expiresAt
                ? daysUntil(workspace.expiresAt)
                : 0;
            return {
                phase,
                label: deletionLabel(workspace.expiresAt),
                dotClass:
                    days <= 1 ? "bg-destructive" : "bg-foreground-third",
            };
        }
        case "expired":
            return {
                phase,
                label: "Deletes tonight",
                dotClass: "bg-destructive",
            };
    }
};

export const joinDenialLabel = (
    workspace: LifecycleFields,
    now: number = Date.now(),
): string | null => {
    switch (lifecyclePhase(workspace, now)) {
        case "unscheduled":
            return "Set a start time to open";
        case "scheduled":
            return `Opens ${formatTimeUntil(workspace.opensAt ?? "", now)}`;
        case "expired":
            return "No longer available";
        default:
            return null;
    }
};
