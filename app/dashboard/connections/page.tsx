import ConnectionsClient from "@/components/dashboard/connections/ConnectionsClient";
import { entitlementsForUser } from "@/lib/serverPlan";
import { getUserRole } from "@/lib/serverRole";
import { readSidebarCookie } from "@/lib/serverSidebarCookie";
import { readTableDensityCookie } from "@/lib/serverTableDensityCookie";
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

const resolveLinkedStudentsLimit = async (): Promise<number | null> => {
    const { userId } = await auth();
    if (!userId) return null;
    return (await entitlementsForUser(userId))?.maxLinkedStudents ?? null;
};

const resolveHasPlan = async (): Promise<boolean> => {
    const { userId } = await auth();
    if (!userId) return false;
    return (await entitlementsForUser(userId)) !== null;
};

const page = async () => {
    const role = await resolveRole();
    const linkedStudentsLimit = await resolveLinkedStudentsLimit();
    const hasPlan = await resolveHasPlan();
    const sidebarCollapsed = await readSidebarCookie();
    const tableDensity = await readTableDensityCookie();
    return (
        <ConnectionsClient
            role={role}
            linkedStudentsLimit={linkedStudentsLimit}
            hasPlan={hasPlan}
            sidebarCollapsed={sidebarCollapsed}
            tableDensity={tableDensity}
        />
    );
};

export default page;
