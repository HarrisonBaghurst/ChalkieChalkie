"use client";

import { useUser } from "@clerk/nextjs";
import { UserRole } from "@/types/userTypes";
import { parseUserRole } from "@/lib/roles";

// Reads the account role off the hydrated Clerk user. Returns "student" until
// Clerk loads, so gate anything privileged on `isLoaded` too (see Sidebar) or
// resolve the role server-side and pass it down.
export const useUserRole = (): UserRole => {
    const { user } = useUser();
    return parseUserRole(user?.publicMetadata?.role);
};
