import ConnectionsClient from "@/components/dashboard/connections/ConnectionsClient";
import { entitlementsForUser, grantedPlanForUser } from "@/lib/serverPlan";
import { getUserRole } from "@/lib/serverRole";
import { readSidebarCookie } from "@/lib/serverSidebarCookie";
import { readTableDensityCookie } from "@/lib/serverTableDensityCookie";
import { PlanId } from "@/types/planTypes";
import { UserRole } from "@/types/userTypes";
import { auth } from "@clerk/nextjs/server";

const resolveRole = async (): Promise<UserRole | undefined> => {
    const { userId } = await auth();
    if (!userId) return undefined;
    try {
        return await getUserRole(userId);
    } catch (err) {
        console.error(
            "[dashboard/connections] failed to resolve user role",
            err,
        );
        return undefined;
    }
};

const resolvePlanId = async (): Promise<PlanId | null> => {
    const { userId } = await auth();
    if (!userId) return null;
    return grantedPlanForUser(userId);
};

const resolveLinkedStudentsLimit = async (): Promise<number | null> => {
    const { userId } = await auth();
    if (!userId) return null;
    return (await entitlementsForUser(userId))?.maxLinkedStudents ?? null;
};

const page = async () => {
    const role = await resolveRole();
    const planId = await resolvePlanId();
    const linkedStudentsLimit = await resolveLinkedStudentsLimit();
    const sidebarCollapsed = await readSidebarCookie();
    const tableDensity = await readTableDensityCookie();
    return (
        <ConnectionsClient
            role={role}
            planId={planId}
            linkedStudentsLimit={linkedStudentsLimit}
            sidebarCollapsed={sidebarCollapsed}
            tableDensity={tableDensity}
        />
    );
};

export default page;
