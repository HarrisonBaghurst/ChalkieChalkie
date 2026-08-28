import { UserRole } from "@/types/userTypes";

export type DashboardActionId = "create-workspace" | "add-link";

export type DashboardAction = {
    id: DashboardActionId;
    label: string;
    icon: string;
    iconDark: string;
};

const CREATE_WORKSPACE: DashboardAction = {
    id: "create-workspace",
    label: "Create workspace",
    icon: "/icons/file-plus-corner.svg",
    iconDark: "/icons/file-plus-corner-dark.svg",
};

const ADD_STUDENT: DashboardAction = {
    id: "add-link",
    label: "Add a student",
    icon: "/icons/user-round-plus.svg",
    iconDark: "/icons/user-round-plus-dark.svg",
};

const ADD_TUTOR: DashboardAction = {
    id: "add-link",
    label: "Add a tutor",
    icon: "/icons/user-round-plus.svg",
    iconDark: "/icons/user-round-plus-dark.svg",
};

export const resolveDashboardAction = (
    pathname: string,
    role: UserRole,
): DashboardAction | null => {
    if (pathname === "/dashboard/connections") {
        if (role === "tutor") return ADD_STUDENT;
        if (role === "student") return ADD_TUTOR;
        return null;
    }
    return role === "tutor" ? CREATE_WORKSPACE : null;
};
