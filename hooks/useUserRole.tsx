"use client";

import { useUser } from "@clerk/nextjs";
import { UserRole } from "@/types/userTypes";
import { parseUserRole } from "@/lib/roles";

// Returns "student" until Clerk hydrates, so gate privileged UI on `isLoaded`
// too, or take a server-resolved role as a prop.
export const useUserRole = (): UserRole => {
    const { user } = useUser();
    return parseUserRole(user?.publicMetadata?.role);
};
