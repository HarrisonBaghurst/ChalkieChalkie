import "server-only";

import { PlanEntitlements, PlanId, PlanStatus } from "@/types/planTypes";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const PLAN_ENTITLEMENTS: Record<PlanId, PlanEntitlements> = {
    basic: {
        maxWorkspaceMembers: 2,
        workspacesPerMonth: 20,
        maxLinkedStudents: 5,
        retentionMs: 14 * DAY_MS,
        leadMs: 1 * HOUR_MS,
    },
    plus: {
        maxWorkspaceMembers: 8,
        workspacesPerMonth: 100,
        maxLinkedStudents: 40,
        retentionMs: 90 * DAY_MS,
        leadMs: 24 * HOUR_MS,
    },
    professional: {
        maxWorkspaceMembers: 20,
        workspacesPerMonth: null,
        maxLinkedStudents: null,
        retentionMs: 365 * DAY_MS,
        leadMs: 72 * HOUR_MS,
    },
};

const GRANTING_STATUSES: Record<PlanStatus, boolean> = {
    active: true,
    trialing: true,
    past_due: false,
    cancelled: false,
};

export const PLAN_IDS = Object.keys(PLAN_ENTITLEMENTS) as PlanId[];

export const parsePlanId = (value: unknown): PlanId | null =>
    typeof value === "string" && value in PLAN_ENTITLEMENTS
        ? (value as PlanId)
        : null;

export const parsePlanStatus = (value: unknown): PlanStatus | null =>
    typeof value === "string" && value in GRANTING_STATUSES
        ? (value as PlanStatus)
        : null;

export const statusGrantsEntitlements = (status: PlanStatus): boolean =>
    GRANTING_STATUSES[status];

export const entitlementsFor = (plan: PlanId): PlanEntitlements =>
    PLAN_ENTITLEMENTS[plan];
