import { DASHBOARD_GRACE_MS } from "@/lib/dashboardFilters";
import { daysUntil, formatTimeUntil } from "@/lib/textUtils";
import { WorkspaceLimits } from "@/types/planTypes";

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

export type LifecycleFields = {
    startTime: string | null;
    opensAt: string | null;
    expiresAt: string | null;
    openedAt: string | null;
};

export type AccessDenial =
    | "unscheduled"
    | "not-open"
    | "expired"
    | "awaiting-host";

export const boardAccessDenial = (
    workspace: Pick<LifecycleFields, "opensAt" | "expiresAt" | "openedAt">,
    viewerIsHost: boolean,
    now: number = Date.now(),
): AccessDenial | null => {
    const opens = parseInstant(workspace.opensAt);
    if (opens === null) return "unscheduled";
    if (now < opens) return "not-open";

    const expires = parseInstant(workspace.expiresAt);
    if (expires !== null && now >= expires) return "expired";

    if (!viewerIsHost && !workspace.openedAt) return "awaiting-host";

    return null;
};

export type StartTimeLockReason = "opened" | "started";

export const startTimeLockReason = (
    workspace: Pick<LifecycleFields, "startTime" | "openedAt">,
    now: number = Date.now(),
): StartTimeLockReason | null => {
    if (workspace.openedAt) return "opened";
    const start = parseInstant(workspace.startTime);
    return start !== null && now >= start ? "started" : null;
};

export const isStartTimeLocked = (
    workspace: Pick<LifecycleFields, "startTime" | "openedAt">,
    now: number = Date.now(),
): boolean => startTimeLockReason(workspace, now) !== null;

export const opensImmediately = (
    startTime: Date | null,
    limits: WorkspaceLimits,
    now: number = Date.now(),
): boolean =>
    startTime !== null && startTime.getTime() - limits.leadMs <= now;

export type LifecyclePhase =
    | "unscheduled"
    | "scheduled"
    | "ready"
    | "open"
    | "past"
    | "expired";

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

    return workspace.openedAt ? "open" : "ready";
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

const availabilityLabel = (opensAt: string | null, now: number): string =>
    `Ready ${formatTimeUntil(opensAt ?? "", now)}`;

export const lifecycleStatus = (
    workspace: LifecycleFields,
    viewerIsHost: boolean,
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
                label: availabilityLabel(workspace.opensAt, now),
                dotClass: "bg-amber-400",
            };
        case "ready":
            return viewerIsHost
                ? {
                      phase,
                      label: "Ready to open",
                      dotClass: "bg-green-500",
                  }
                : {
                      phase,
                      label: "Waiting for tutor",
                      dotClass: "bg-amber-400",
                  };
        case "open":
            return { phase, label: "Open", dotClass: "bg-green-500" };
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
    viewerIsHost: boolean,
    now: number = Date.now(),
): string | null => {
    switch (lifecyclePhase(workspace, now)) {
        case "unscheduled":
            return "Set a start time to open";
        case "scheduled":
            return availabilityLabel(workspace.opensAt, now);
        case "ready":
            return viewerIsHost ? null : "Waiting for your tutor";
        case "expired":
            return "No longer available";
        default:
            return null;
    }
};
