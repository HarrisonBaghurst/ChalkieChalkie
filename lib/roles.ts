import { UserRole } from "@/types/userTypes";

// Record<UserRole, true> so adding a role to the union fails to compile until
// it is listed here.
const ROLE_SET: Record<UserRole, true> = {
    student: true,
    tutor: true,
    admin: true,
};

export const USER_ROLES = Object.keys(ROLE_SET) as UserRole[];

// Fails closed to the least-privileged role.
export const parseUserRole = (value: unknown): UserRole =>
    typeof value === "string" && value in ROLE_SET
        ? (value as UserRole)
        : "student";
