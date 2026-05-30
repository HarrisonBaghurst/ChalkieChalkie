import { Workspace } from "@/types/userTypes";

export const DASHBOARD_GRACE_MS = 5 * 60 * 1000;

export type SortDirection = "asc" | "desc";

export const applyDashboardFilters = (
    workspaces: Workspace[],
    search: string,
    selectedTuteeIds: string[],
    sortDir: SortDirection,
): Workspace[] => {
    let result = [...workspaces];

    const query = search.trim().toLowerCase();
    if (query) {
        result = result.filter((w) =>
            w.title?.toLowerCase().includes(query),
        );
    }

    if (selectedTuteeIds.length > 0) {
        result = result.filter((w) =>
            selectedTuteeIds.some((id) => w.collaboratorIds?.includes(id)),
        );
    }

    result.sort((a, b) => {
        const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
        const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
        const diff = aTime - bTime;
        return sortDir === "asc" ? diff : -diff;
    });

    return result;
};
