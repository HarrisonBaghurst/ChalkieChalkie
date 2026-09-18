import "server-only";

import { entitlementsFor } from "@/lib/plans/entitlements";
import { PLAN_ORDER } from "@/lib/plans/pricingCopy";
import { PlanComparisonRow, PlanEntitlements } from "@/types/planTypes";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const plural = (count: number, noun: string): string =>
    `${count} ${noun}${count === 1 ? "" : "s"}`;

const window = (ms: number): string =>
    ms >= DAY_MS
        ? plural(Math.round(ms / DAY_MS), "day")
        : plural(Math.round(ms / HOUR_MS), "hour");

const ROWS: { label: string; value: (e: PlanEntitlements) => string }[] = [
    {
        label: "People in a lesson",
        value: (e) =>
            `Yourself and ${e.maxWorkspaceMembers - 1} ${e.maxWorkspaceMembers === 2 ? "student" : "students"}.`,
    },
    {
        label: "Lessons per month",
        value: (e) => e.workspacesPerMonth?.toString() ?? "Unlimited",
    },
    {
        label: "Linked students",
        value: (e) => e.maxLinkedStudents?.toString() ?? "Unlimited",
    },
    {
        label: "Workspaces kept for",
        value: (e) => window(e.retentionMs),
    },
    {
        label: "Open a workspace early by",
        value: (e) => window(e.leadMs),
    },
];

export const planComparison = (): PlanComparisonRow[] =>
    ROWS.map((row) => ({
        label: row.label,
        values: PLAN_ORDER.map((plan) => row.value(entitlementsFor(plan))),
    }));
