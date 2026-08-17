import ConnectionsClient from "@/components/dashboard/connections/ConnectionsClient";
import { getUserRole } from "@/lib/serverRole";
import { UserRole } from "@/types/userTypes";
import { auth } from "@clerk/nextjs/server";

// Server-side so the heading is right on first paint; see app/dashboard/page.tsx
// for why auth() stays outside the try.
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
    return <ConnectionsClient role={role} />;
};

export default page;
