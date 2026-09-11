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

export const ACTION_HIGHLIGHT_PARAM = "highlight";

const ACTION_ID_SET: Record<DashboardActionId, true> = {
    "create-workspace": true,
    "add-link": true,
};

export const parseActionHighlight = (
    value: string | null,
): DashboardActionId | null =>
    value && value in ACTION_ID_SET ? (value as DashboardActionId) : null;

export const actionHighlightHref = (
    pathname: string,
    id: DashboardActionId,
): string => `${pathname}?${ACTION_HIGHLIGHT_PARAM}=${id}`;

export const ACTION_HIGHLIGHT_CLASS = "animate-pulse gradient-ring";

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
