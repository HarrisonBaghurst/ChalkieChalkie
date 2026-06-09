"use client";

import { useUser } from "@clerk/nextjs";
import { UserRole } from "@/types/userTypes";

export const useUserRole = (): UserRole => {
    const { user } = useUser();
    return user?.publicMetadata?.role === "tutor" ? "tutor" : "student";
};
