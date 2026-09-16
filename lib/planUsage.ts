import { PlanEntitlements, PlanUsage } from "@/types/planTypes";
import { resetLabel } from "@/lib/planDenialCopy";

export type UsageMeter = {
    key: string;
    label: string;
    tally: string;
    ratio: number | null;
    caption: string;
    atLimit: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const plural = (count: number, noun: string): string =>
    `${count} ${noun}${count === 1 ? "" : "s"}`;

const fill = (used: number, limit: number): number =>
    limit > 0 ? Math.min(used / limit, 1) : 1;

const workspaceMeter = (
    entitlements: PlanEntitlements,
    usage: PlanUsage | null,
): UsageMeter => {
    const used = usage?.workspacesThisMonth ?? 0;
    const limit = entitlements.workspacesPerMonth;
    const label = "Workspaces this month";

    if (limit === null) {
        return {
            key: "workspaces",
            label,
            tally: `${used} created`,
            ratio: null,
            caption: "Unlimited on your plan",
            atLimit: false,
        };
    }

    const atLimit = used >= limit;
    const resets = resetLabel(usage?.periodEnd);

    return {
        key: "workspaces",
        label,
        tally: `${used} / ${limit}`,
        ratio: fill(used, limit),
        caption: atLimit
            ? `Limit reached — resets ${resets}`
            : `Resets ${resets}`,
        atLimit,
    };
};

const studentsMeter = (
    entitlements: PlanEntitlements,
    linked: number,
): UsageMeter => {
    const limit = entitlements.maxLinkedStudents;
    const label = "Linked students";

    if (limit === null) {
        return {
            key: "students",
            label,
            tally: `${linked} linked`,
            ratio: null,
            caption: "Unlimited on your plan",
            atLimit: false,
        };
    }

    const atLimit = linked >= limit;

    return {
        key: "students",
        label,
        tally: `${linked} / ${limit}`,
        ratio: fill(linked, limit),
        caption: atLimit
            ? "Limit reached — remove one to link another"
            : `${plural(limit - linked, "place")} left`,
        atLimit,
    };
};

export const resolveUsageMeters = (
    entitlements: PlanEntitlements,
    usage: PlanUsage | null,
    linkedStudents: number | null,
): UsageMeter[] => {
    const meters = [workspaceMeter(entitlements, usage)];
    if (linkedStudents !== null)
        meters.push(studentsMeter(entitlements, linkedStudents));
    return meters;
};

export const planFactsLine = (entitlements: PlanEntitlements): string => {
    const days = Math.round(entitlements.retentionMs / DAY_MS);
    return `Up to ${entitlements.maxWorkspaceMembers} people per lesson · boards kept for ${plural(days, "day")}`;
};
