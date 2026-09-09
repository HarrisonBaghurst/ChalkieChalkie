import ConnectionsClient from "@/components/dashboard/connections/ConnectionsClient";
import { getUserRole } from "@/lib/serverRole";
import { readSidebarCookie } from "@/lib/serverSidebarCookie";
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

const page = async () => {
    const role = await resolveRole();
    const sidebarCollapsed = await readSidebarCookie();
    return (
        <ConnectionsClient role={role} sidebarCollapsed={sidebarCollapsed} />
    );
};

export default page;
