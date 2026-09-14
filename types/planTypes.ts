export type PlanId = "basic" | "plus" | "professional";

export type PlanStatus = "active" | "trialing" | "past_due" | "cancelled";

export type PlanEntitlements = {
    maxWorkspaceMembers: number;
    workspacesPerMonth: number | null;
    maxLinkedStudents: number | null;
    retentionMs: number;
    leadMs: number;
};

export type WorkspaceLimits = Pick<PlanEntitlements, "leadMs" | "retentionMs">;

export type UserPlan = {
    plan: PlanId;
    status: PlanStatus;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
};

export type UsageMetric = "workspaces_created";

export type PlanUsage = {
    workspacesThisMonth: number;
    periodStart: string;
    periodEnd: string;
};

export type EntitlementDenial =
    | "no-plan"
    | "members"
    | "quota"
    | "linked-students";
