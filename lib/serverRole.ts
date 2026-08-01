import { clerkClient } from "@clerk/nextjs/server";
import { UserRole } from "@/types/userTypes";
import { parseUserRole } from "@/lib/roles";

export const getUserRole = async (userId: string): Promise<UserRole> => {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return parseUserRole(user?.publicMetadata?.role);
};

// Roles are mutually exclusive, so each guard demands its exact role rather
// than a privilege level: requireTutor rejects an admin, requireAdmin rejects
// a tutor. Neither role is a superset of the other.
const requireRole = async (
    userId: string,
    role: UserRole,
): Promise<Response | null> => {
    if ((await getUserRole(userId)) !== role) {
        return new Response("Forbidden", { status: 403 });
    }
    return null;
};

export const requireTutor = (userId: string): Promise<Response | null> =>
    requireRole(userId, "tutor");

export const requireAdmin = (userId: string): Promise<Response | null> =>
    requireRole(userId, "admin");
