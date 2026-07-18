import { Workspace } from "@/types/userTypes";

export const DASHBOARD_GRACE_MS = 5 * 60 * 1000;

export type SortDirection = "asc" | "desc";

// Central description of every dashboard filter. Add new filter fields here and
// they flow through EMPTY_DASHBOARD_FILTERS / hasActiveDashboardFilters and the
// shared topbar without touching call sites.
export type DashboardFilterState = {
    search: string;
    collaboratorIds: string[];
};

export const EMPTY_DASHBOARD_FILTERS: DashboardFilterState = {
    search: "",
    collaboratorIds: [],
};

export const hasActiveDashboardFilters = (
    filters: DashboardFilterState,
): boolean =>
    filters.search.trim().length > 0 || filters.collaboratorIds.length > 0;

export const applyDashboardFilters = (
    workspaces: Workspace[],
    filters: DashboardFilterState,
    sortDir: SortDirection,
): Workspace[] => {
    let result = [...workspaces];

    const query = filters.search.trim().toLowerCase();
    if (query) {
        result = result.filter((w) =>
            w.title?.toLowerCase().includes(query),
        );
    }

    if (filters.collaboratorIds.length > 0) {
        result = result.filter((w) =>
            filters.collaboratorIds.some((id) =>
                w.collaboratorIds?.includes(id),
            ),
        );
    }

    result.sort((a, b) => {
        const aTime = a.startTime ? new Date(a.startTime).getTime() : NaN;
        const bTime = b.startTime ? new Date(b.startTime).getTime() : NaN;
        const aValid = !Number.isNaN(aTime);
        const bValid = !Number.isNaN(bTime);
        if (aValid && !bValid) return -1;
        if (!aValid && bValid) return 1;
        if (!aValid && !bValid) return 0;
        const diff = aTime - bTime;
        return sortDir === "asc" ? diff : -diff;
    });

    return result;
};
