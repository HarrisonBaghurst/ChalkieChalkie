export type TableDensity = "compact" | "default" | "comfortable";

export const TABLE_DENSITY_COOKIE = "chalkie_density";

const TABLE_DENSITY_COOKIE_PATH = "/dashboard";
const TABLE_DENSITY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const parseTableDensityCookie = (
    raw: string | undefined,
): TableDensity =>
    raw === "compact" || raw === "comfortable" ? raw : "default";

export const writeTableDensityCookie = (density: TableDensity) => {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie =
        `${TABLE_DENSITY_COOKIE}=${density}` +
        `; Path=${TABLE_DENSITY_COOKIE_PATH}` +
        `; Max-Age=${TABLE_DENSITY_COOKIE_MAX_AGE}` +
        `; SameSite=Lax${secure}`;
};
