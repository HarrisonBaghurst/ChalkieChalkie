import { PlanId, PlanStatus } from "@/types/planTypes";

export type AccountLosses = {
    hostedUpcoming: number;
    hostedPast: number;
    affectedStudents: number;
    links: number;
    joinedWorkspaces: number;
};

export type PlanSummary = {
    plan: PlanId | null;
    status: PlanStatus | null;
    granting: boolean;
    comped: boolean;
    hasSubscription: boolean;
    hasBilling: boolean;
    currentPeriodEnd: string | null;
    pendingPlan: PlanId | null;
    pendingPlanAt: string | null;
    cancelsAt: string | null;
};

export type SettingsData = {
    plan: PlanSummary;
    losses: AccountLosses | null;
};
