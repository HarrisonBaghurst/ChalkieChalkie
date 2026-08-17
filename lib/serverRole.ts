import { clerkClient } from "@clerk/nextjs/server";
import { UserRole } from "@/types/userTypes";
import { LinkRole } from "@/types/linkTypes";
import { parseUserRole } from "@/lib/roles";

export const getUserRole = async (userId: string): Promise<UserRole> => {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return parseUserRole(user?.publicMetadata?.role);
};

// Exact match, not a privilege level: requireTutor rejects an admin.
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

// Returns the role rather than discarding it — the invite flow needs to know
// which side the caller is on. Admin holds no links, so it is rejected.
export const requireLinkRole = async (
    userId: string,
): Promise<LinkRole | Response> => {
    const role = await getUserRole(userId);
    if (role !== "student" && role !== "tutor") {
        return new Response("Forbidden", { status: 403 });
    }
    return role;
};
