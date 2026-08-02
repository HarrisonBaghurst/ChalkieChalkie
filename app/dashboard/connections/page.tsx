import ConnectionsClient from "@/components/dashboard/connections/ConnectionsClient";
import { getUserRole } from "@/lib/serverRole";
import { UserRole } from "@/types/userTypes";
import { auth } from "@clerk/nextjs/server";

// Resolves the account role server-side so the heading ("Your Students" vs
// "Your Tutors") is right on first paint instead of appearing once Clerk
// hydrates. Same convention as app/dashboard/page.tsx — see the comment there
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
