export type PlanId = "basic" | "plus" | "professional";

export type PlanStatus =
    | "active"
    | "trialing"
    | "past_due"
    | "unpaid"
    | "cancelled";

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
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
};

export type PlanComparisonRow = {
    label: string;
    values: string[];
};

export type PlanRow = {
    plan: PlanId | null;
    status: PlanStatus | null;
    currentPeriodEnd: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    pendingPlan: PlanId | null;
    pendingPlanAt: string | null;
    cancelsAt: string | null;
    reconcilePending: boolean;
    updatedAt: string | null;
    lastEventAt: string | null;
};

export type PendingPlanChange = {
    plan: PlanId;
    at: string;
};

export type SwitchWhen = "now" | "period-end";

export type BillingIntentKind = "checkout" | "switch";

export type BillingIntentStatus = "creating" | "open";

export type BillingIntentRow = {
    userId: string;
    kind: BillingIntentKind;
    plan: PlanId;
    intentId: string;
    status: BillingIntentStatus;
    stripeSessionId: string | null;
    expiresAt: string;
};

export type BillingClaim =
    | { owned: true; intent: BillingIntentRow }
    | { owned: false; intent: BillingIntentRow };

export type UsagePeriod = {
    start: string;
    end: string;
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
    | "linked-students"
    | "horizon";

export type ReconcileSummary = {
    userId: string;
    plan: PlanId | null;
    ok: boolean;
    roomsRewindowed: number;
    linksDeactivated: number;
    linksReactivated: number;
    roomsOverCap: string[];
};
