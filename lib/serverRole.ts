import "server-only";

import { UserRole } from "@/types/userTypes";
import { LinkRole } from "@/types/linkTypes";
import { grantedPlanForUser, planDenial } from "@/lib/serverPlan";

const adminUserIds = (): Set<string> =>
    new Set(
        (process.env.ADMIN_USER_IDS ?? "")
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean),
    );

export const isAdmin = (userId: string): boolean =>
    adminUserIds().has(userId);

export const getUserRole = async (userId: string): Promise<UserRole> => {
    if (isAdmin(userId)) return "admin";
    return (await grantedPlanForUser(userId)) ? "tutor" : "student";
};

export const requireTutor = async (
    userId: string,
): Promise<Response | null> => {
    if ((await getUserRole(userId)) === "tutor") return null;
    return planDenial(
        "no-plan",
        "This account does not have an active plan",
    );
};

export const requireAdmin = async (
    userId: string,
): Promise<Response | null> =>
    isAdmin(userId) ? null : new Response("Forbidden", { status: 403 });

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
