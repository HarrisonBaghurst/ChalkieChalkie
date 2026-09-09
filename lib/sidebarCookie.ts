export type CollapseState = boolean | null;

export const SIDEBAR_COOKIE = "chalkie_sidebar";

const SIDEBAR_COOKIE_PATH = "/dashboard";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const parseSidebarCookie = (raw: string | undefined): CollapseState =>
    raw === "rail" ? true : raw === "panel" ? false : null;

export const writeSidebarCookie = (collapsed: boolean) => {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie =
        `${SIDEBAR_COOKIE}=${collapsed ? "rail" : "panel"}` +
        `; Path=${SIDEBAR_COOKIE_PATH}` +
        `; Max-Age=${SIDEBAR_COOKIE_MAX_AGE}` +
        `; SameSite=Lax${secure}`;
};
