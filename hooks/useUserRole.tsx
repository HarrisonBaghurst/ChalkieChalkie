"use client";

import { useUser } from "@clerk/nextjs";

export type UserRole = "tutor" | "student";

export const useUserRole = (): UserRole => {
    const { user } = useUser();
    return user?.publicMetadata?.role === "tutor" ? "tutor" : "student";
};
