import SettingsClient from "@/components/dashboard/settings/SettingsClient";
import { accountLosses } from "@/lib/deleteAccount";
import { reportError } from "@/lib/errorResponse";
import { statusGrantsEntitlements } from "@/lib/plans/entitlements";
import { readPlanRow } from "@/lib/plans/planRow";
import { getUserRole } from "@/lib/serverRole";
import { readSidebarCookie } from "@/lib/serverSidebarCookie";
import { readTableDensityCookie } from "@/lib/serverTableDensityCookie";
import { PlanRow } from "@/types/planTypes";
import { AccountLosses, PlanSummary, SettingsData } from "@/types/settingsTypes";
import { UserRole } from "@/types/userTypes";
import { auth } from "@clerk/nextjs/server";

const resolveRole = async (userId: string): Promise<UserRole | undefined> => {
    try {
        return await getUserRole(userId);
    } catch (err) {
        console.error("[dashboard/settings] failed to resolve user role", err);
        return undefined;
    }
};

const resolveLosses = async (
    userId: string,
): Promise<AccountLosses | null> => {
    try {
        return await accountLosses(userId);
    } catch (err) {
        await reportError("settings:losses", err, undefined, userId);
        return null;
    }
};

const summarise = (row: PlanRow | null): PlanSummary => {
    const granting = !!row?.status && statusGrantsEntitlements(row.status);

    return {
        plan: row?.plan ?? null,
        status: row?.status ?? null,
        granting,
        comped: granting && !row?.stripeCustomerId,
        hasSubscription: !!row?.stripeSubscriptionId,
        hasBilling: !!row?.stripeCustomerId,
        currentPeriodEnd: row?.currentPeriodEnd ?? null,
        pendingPlan: row?.pendingPlan ?? null,
        pendingPlanAt: row?.pendingPlanAt ?? null,
        cancelsAt: row?.cancelsAt ?? null,
    };
};

const resolveSettings = async (
    userId: string,
    role: UserRole | undefined,
): Promise<SettingsData | null> => {
    if (!role || role === "admin") return null;

    const [row, losses] = await Promise.all([
        readPlanRow(userId),
        resolveLosses(userId),
    ]);

    return { plan: summarise(row), losses };
};

const page = async () => {
    const { userId } = await auth();
    const role = userId ? await resolveRole(userId) : undefined;
    const settings = userId ? await resolveSettings(userId, role) : null;
    const sidebarCollapsed = await readSidebarCookie();
    const tableDensity = await readTableDensityCookie();

    return (
        <SettingsClient
            role={role}
            settings={settings}
            sidebarCollapsed={sidebarCollapsed}
            tableDensity={tableDensity}
        />
    );
};

export default page;
