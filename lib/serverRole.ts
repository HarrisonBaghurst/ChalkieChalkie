import { clerkClient } from "@clerk/nextjs/server";
import { UserRole } from "@/types/userTypes";
import { LinkRole } from "@/types/linkTypes";
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

/**
 * The caller's role, when it is one that can hold a tutor-student link, or a
 * 403 Response otherwise. Admin is rejected: roles are mutually exclusive and
 * admin confers no product privileges (lib/roles.ts), so an admin can hold no
 * links. Unlike requireTutor/requireAdmin this returns the role itself rather
 * than discarding it — the invite generate/redeem flow needs to know which
 * side the caller is on, not just whether they're allowed through.
 */
export const requireLinkRole = async (
    userId: string,
): Promise<LinkRole | Response> => {
    const role = await getUserRole(userId);
    if (role !== "student" && role !== "tutor") {
        return new Response("Forbidden", { status: 403 });
    }
    return role;
};
