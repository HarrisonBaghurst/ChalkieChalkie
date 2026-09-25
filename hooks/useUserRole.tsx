"use client";

import { ReactNode, createContext, useContext } from "react";
import { UserRole } from "@/types/userTypes";

const UserRoleContext = createContext<UserRole>("student");

export const UserRoleProvider = ({
    value,
    children,
}: {
    value: UserRole;
    children: ReactNode;
}) => (
    <UserRoleContext.Provider value={value}>{children}</UserRoleContext.Provider>
);

export const useUserRole = (): UserRole => useContext(UserRoleContext);
