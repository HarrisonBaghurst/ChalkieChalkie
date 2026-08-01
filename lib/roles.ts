import { UserRole } from "@/types/userTypes";

/**
 * Account roles, as stored in Clerk `publicMetadata.role`.
 *
 * The three roles are mutually exclusive and confer separate privileges — an
 * admin is deliberately NOT a tutor and holds no tutor privileges, so
 * `requireTutor` rejects admins just as it rejects students. Anything an admin
 * needs must be granted to `admin` explicitly.
 *
 *   student — the default. Joins workspaces they were invited to.
 *   tutor   — creates, edits and deletes workspaces; can look up friends.
 *   admin   — internal tooling only (e.g. /style-guide). No product privileges.
 *
 * Typed as `Record<UserRole, true>` so adding a role to the union is a compile
 * error until it is listed here.
 */
const ROLE_SET: Record<UserRole, true> = {
    student: true,
    tutor: true,
    admin: true,
};

export const USER_ROLES = Object.keys(ROLE_SET) as UserRole[];

/**
 * Narrow an untrusted `publicMetadata.role` value to a `UserRole`.
 *
 * Fails closed: anything unrecognised (absent, misspelled, wrong type) reads as
 * "student", the least-privileged role. Shared by the server lookup
 * (`lib/serverRole.ts`) and the client hook (`hooks/useUserRole.tsx`) so the
 * two can never disagree about what a stored value means.
 */
export const parseUserRole = (value: unknown): UserRole =>
    typeof value === "string" && value in ROLE_SET
        ? (value as UserRole)
        : "student";
