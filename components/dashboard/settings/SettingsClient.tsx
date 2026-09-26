"use client";

import React, { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { UserRoleProvider } from "@/hooks/useUserRole";
import { useKeepPlan } from "@/hooks/useKeepPlan";
import { CollapseState } from "@/lib/sidebarCookie";
import { TableDensity } from "@/lib/tableDensityCookie";
import { PLAN_LABELS } from "@/lib/plans/labels";
import { ONELINK_URL, PLAN_COPY } from "@/lib/plans/pricingCopy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StepperFormDialog from "@/components/forms/StepperFormDialog";
import ReportConcernDialog from "@/components/ReportConcernDialog";
import { BUG_REPORT } from "@/lib/forms/bugReport";
import { PlanStatus } from "@/types/planTypes";
import { PlanSummary, SettingsData } from "@/types/settingsTypes";
import { UserRole } from "@/types/userTypes";
import DashboardShell from "../DashboardShell";
import Sidebar from "../Sidebar";
import TabBar from "../mobile/TabBar";
import { byCollapseState, useSidebarCollapse } from "../sidebarCollapse";
import CancelPlanDialog from "./CancelPlanDialog";
import DeleteAccountDialog from "./DeleteAccountDialog";
import {
    longDate,
    SettingsAction,
    SettingsCard,
    SettingsRow,
    SettingsRows,
} from "./SettingsSection";

type SettingsClientProps = {
    role?: UserRole;
    settings: SettingsData | null;
    sidebarCollapsed?: CollapseState;
    tableDensity?: TableDensity;
};

const STATUS_COPY: Record<PlanStatus, string> = {
    active: "Active",
    trialing: "Trial",
    past_due: "Overdue — your last payment failed and Stripe is retrying it",
    unpaid: "Overdue — payment failed, so your plan is paused",
    cancelled: "Ended",
};

const OVERDUE = new Set<PlanStatus>(["past_due", "unpaid"]);

const statusLabel = (plan: PlanSummary): string => {
    if (plan.comped) return "Complimentary";
    if (!plan.status) return "No plan";
    if (plan.cancelsAt && plan.granting) return "Cancelling";
    return STATUS_COPY[plan.status];
};

const NextPayment = ({ plan }: { plan: PlanSummary }) => {
    const date = longDate(plan.currentPeriodEnd);
    const price = PLAN_COPY[plan.pendingPlan ?? plan.plan!].price;

    if (!date) return <>Not yet known</>;

    return (
        <>
            {price} on {date}
        </>
    );
};

const ManageBillingButton = () => (
    <Button asChild variant="outline" size="default">
        <a href={ONELINK_URL} target="_blank" rel="noopener noreferrer">
            Manage billing on Link
        </a>
    </Button>
);

const PaymentOverdue = ({ plan }: { plan: PlanSummary }) => {
    if (!plan.status || !OVERDUE.has(plan.status)) return null;

    return (
        <SettingsCard
            title="Your payment is overdue"
            description={
                plan.status === "past_due"
                    ? "You keep everything your plan allows while Stripe retries the payment."
                    : "Stripe has stopped retrying, so your plan is paused until the payment goes through."
            }
            tone="warning"
        >
            <SettingsRows>
                <SettingsRow
                    label="Last payment"
                    action={plan.hasBilling ? <ManageBillingButton /> : undefined}
                >
                    Did not go through. Update your card on Link so the next
                    attempt succeeds.
                </SettingsRow>
            </SettingsRows>
        </SettingsCard>
    );
};

const PendingChange = ({ plan }: { plan: PlanSummary }) => {
    const current = plan.granting && plan.plan ? plan.plan : null;
    if (!current || (!plan.pendingPlan && !plan.cancelsAt)) return null;

    const label = PLAN_LABELS[current];

    return (
        <SettingsCard
            title={plan.cancelsAt ? "Your plan is ending" : "Plan change scheduled"}
            description="Nothing changes before then, and you can undo it at any time."
            tone="warning"
        >
            <SettingsRows>
                {plan.cancelsAt ? (
                    <SettingsRow
                        label="Plan ends"
                        action={<KeepPlanButton label={label} />}
                    >
                        {longDate(plan.cancelsAt) ?? "At the end of this period"}
                        . Your lessons stop opening and your students are
                        unlinked, though nothing is deleted for another 30
                        days.
                    </SettingsRow>
                ) : (
                    <SettingsRow
                        label="Scheduled change"
                        action={<KeepPlanButton label={label} />}
                    >
                        Changes to {PLAN_LABELS[plan.pendingPlan!]} on{" "}
                        {longDate(plan.pendingPlanAt) ??
                            "your next billing date"}
                    </SettingsRow>
                )}
            </SettingsRows>
        </SettingsCard>
    );
};

const PlanAndBilling = ({ plan }: { plan: PlanSummary }) => {
    const current = plan.granting && plan.plan ? plan.plan : null;
    const tier = plan.plan && plan.status !== "cancelled" ? plan.plan : null;
    const billed =
        !!current && plan.hasSubscription && !plan.comped && !plan.cancelsAt;

    return (
        <SettingsCard
            title="Plan and billing"
            description="Your tier, when you next pay and how you pay."
        >
            <SettingsRows>
                <SettingsRow
                    label="Current plan"
                    action={
                        <Button asChild variant="outline" size="default">
                            <Link href="/pricing">
                                {current ? "Change plan" : "View plans"}
                            </Link>
                        </Button>
                    }
                >
                    {tier ? (
                        <Badge variant={current ? "highlight" : "outline"}>
                            {PLAN_LABELS[tier]}
                        </Badge>
                    ) : (
                        "No plan"
                    )}
                </SettingsRow>
                <SettingsRow label="Status">
                    {statusLabel(plan)}
                </SettingsRow>
                {billed && (
                    <SettingsRow label="Next payment">
                        <NextPayment plan={plan} />
                    </SettingsRow>
                )}
                {plan.hasBilling && (
                    <SettingsRow
                        label="Card and receipts"
                        action={<ManageBillingButton />}
                    >
                        Managed by Link, the service Stripe uses to take your
                        payments
                    </SettingsRow>
                )}
            </SettingsRows>

        </SettingsCard>
    );
};

const HelpSection = () => {
    const [contacting, setContacting] = useState(false);
    const [reporting, setReporting] = useState(false);

    return (
        <SettingsCard
            title="Help"
            description="Something not working, or a question about your account?"
        >
            <div className="flex flex-col divide-y divide-foreground-third/25">
                <SettingsAction
                    title="Contact Chalkie Chalkie"
                    description="Send us a message and we will reply by email."
                >
                    <Button
                        variant="outline"
                        size="default"
                        onClick={() => setContacting(true)}
                    >
                        Contact us
                    </Button>
                </SettingsAction>
                <SettingsAction
                    title="Report a concern"
                    description="Tell us about behaviour or content that worries you, including anything that could put a child at risk."
                >
                    <Button
                        variant="outline"
                        size="default"
                        onClick={() => setReporting(true)}
                    >
                        Report a concern
                    </Button>
                </SettingsAction>
            </div>
            {contacting && (
                <StepperFormDialog
                    spec={BUG_REPORT}
                    onClose={() => setContacting(false)}
                />
            )}
            <ReportConcernDialog
                open={reporting}
                onClose={() => setReporting(false)}
                chooseWorkspace
            />
        </SettingsCard>
    );
};

const KeepPlanButton = ({ label }: { label: string }) => {
    const { keep, submitting } = useKeepPlan(label);

    return (
        <Button
            variant="outline"
            size="default"
            disabled={submitting}
            onClick={keep}
        >
            {submitting ? "Working..." : `Keep ${label}`}
        </Button>
    );
};

const DangerZone = ({
    role,
    settings,
}: {
    role: UserRole;
    settings: SettingsData;
}) => {
    const { plan, losses } = settings;
    const current = plan.granting && plan.plan ? plan.plan : null;
    const cancellable = !!current && plan.hasSubscription && !plan.comped;

    return (
        <SettingsCard
            title="Danger zone"
            description="These change your account in ways that are hard or impossible to undo."
            tone="danger"
        >
            <div className="flex flex-col divide-y divide-destructive/30">
                {cancellable &&
                    (plan.cancelsAt ? (
                        <SettingsAction
                            title="Plan set to end"
                            description={`Your ${PLAN_LABELS[current]} plan ends on ${longDate(plan.cancelsAt) ?? "the last day of this period"} and will not renew.`}
                        >
                            <KeepPlanButton label={PLAN_LABELS[current]} />
                        </SettingsAction>
                    ) : (
                        <SettingsAction
                            title="Cancel plan"
                            description={`Stop your ${PLAN_LABELS[current]} plan renewing. You keep it until the end of the period you have paid for.`}
                        >
                            <CancelPlanDialog
                                plan={current}
                                periodEnd={plan.currentPeriodEnd}
                                pendingPlan={plan.pendingPlan}
                                losses={losses}
                            />
                        </SettingsAction>
                    ))}
                <SettingsAction
                    title="Delete account"
                    description="Permanently delete your account and everything in it. This cannot be undone."
                >
                    <DeleteAccountDialog
                        role={role}
                        plan={plan}
                        losses={losses}
                    />
                </SettingsAction>
            </div>
        </SettingsCard>
    );
};

const SettingsColumn = ({ children }: { children: React.ReactNode }) => {
    const { collapsed } = useSidebarCollapse();

    return (
        <div
            className={cn(
                "flex w-full flex-col gap-4",
                byCollapseState(
                    collapsed,
                    "lg:px-[10dvw]",
                    "xl:px-[10dvw]",
                    "xl:px-[10dvw]",
                ),
            )}
        >
            {children}
        </div>
    );
};

const SettingsClient = ({
    role: serverRole,
    settings,
    sidebarCollapsed,
    tableDensity,
}: SettingsClientProps) => {
    const role = serverRole ?? "student";

    return (
        <UserRoleProvider value={role}>
            <DashboardShell
                crumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Settings" },
                ]}
                initialCollapsed={sidebarCollapsed}
                initialDensity={tableDensity}
                sidebar={<Sidebar role={serverRole} />}
                bottomBar={<TabBar role={serverRole} />}
            >
                {settings ? (
                    <SettingsColumn>
                        <PaymentOverdue plan={settings.plan} />
                        <PendingChange plan={settings.plan} />
                        <PlanAndBilling plan={settings.plan} />
                        <HelpSection />
                        <DangerZone role={role} settings={settings} />
                    </SettingsColumn>
                ) : (
                    <div className="flex grow items-center justify-center py-24">
                        <p className="text-body text-foreground-third">
                            You don&apos;t have any relevant settings to change
                        </p>
                    </div>
                )}
            </DashboardShell>
        </UserRoleProvider>
    );
};

export default SettingsClient;
