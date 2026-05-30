"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { userInfo, Workspace } from "@/types/userTypes";
import {
    applyDashboardFilters,
    DASHBOARD_GRACE_MS,
    SortDirection,
} from "@/lib/dashboardFilters";
import { isTutor, viewerIsTutorAcrossAny } from "@/lib/roleStub";
import Actions from "./Actions";
import Filters from "./Filters";
import Next from "./Next";
import Previous from "./Previous";
import Upcoming from "./Upcoming";

const pickCounterparty = (
    workspace: Workspace,
    usersMap: Record<string, userInfo>,
    viewerIsTutor: boolean,
): userInfo | null => {
    if (viewerIsTutor) {
        const firstTuteeId = workspace.collaboratorIds?.find(
            (id) => !isTutor(id, workspace),
        );
        return firstTuteeId ? (usersMap[firstTuteeId] ?? null) : null;
    }
    return usersMap[workspace.host] ?? null;
};

const DashboardClient = () => {
    const { isLoaded, isSignedIn, user } = useUser();

    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [usersInfo, setUsersInfo] = useState<userInfo[]>([]);

    const [selectedTuteeIds, setSelectedTuteeIds] = useState<string[]>([]);
    const [upcomingSearch, setUpcomingSearch] = useState("");
    const [upcomingSortDir, setUpcomingSortDir] = useState<SortDirection>("asc");
    const [previousSearch, setPreviousSearch] = useState("");
    const [previousSortDir, setPreviousSortDir] = useState<SortDirection>("desc");

    const now = useMemo(() => new Date(), []);

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;

        const fetchAll = async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_APP_URL}/api/users/workspaces`,
                    { cache: "no-store" },
                );
                if (!res.ok) {
                    toast.error("Failed to fetch workspaces.", {
                        description: "Please reload the page and try again.",
                    });
                    return;
                }

                type RawRoom = {
                    id: string;
                    title: string;
                    description: string;
                    user_ids: string[];
                    host_id: string;
                    start_time: string;
                    last_activity_at?: string;
                    lastActivity?: string;
                };

                const raw: RawRoom[] = await res.json();
                const mapped: Workspace[] = raw.map((ws) => ({
                    id: ws.id,
                    title: ws.title,
                    description: ws.description,
                    collaboratorIds: ws.user_ids,
                    host: ws.host_id,
                    startTime: ws.start_time,
                    lastActivity: ws.last_activity_at ?? ws.lastActivity ?? "",
                }));
                setWorkspaces(mapped);

                const ids = new Set<string>();
                raw.forEach((ws) => {
                    if (ws.host_id) ids.add(ws.host_id);
                    if (Array.isArray(ws.user_ids))
                        ws.user_ids.forEach((id: string) => ids.add(id));
                });

                if (ids.size === 0) return;

                const usersRes = await fetch(
                    `${process.env.NEXT_PUBLIC_APP_URL}/api/users/batch`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userIds: Array.from(ids) }),
                    },
                );
                if (!usersRes.ok) {
                    toast.error("Failed to fetch users.", {
                        description: "Please reload the page and try again.",
                    });
                    return;
                }

                const usersData = await usersRes.json();
                setUsersInfo(usersData.users ?? []);
            } catch (err) {
                console.error(err);
            }
        };

        fetchAll();
    }, [isLoaded, isSignedIn]);

    const usersMap = useMemo(
        () => Object.fromEntries(usersInfo.map((u) => [u.id, u])),
        [usersInfo],
    );

    const cutoff = now.getTime() - DASHBOARD_GRACE_MS;

    const upcomingAll = useMemo(
        () =>
            workspaces
                .filter((w) => {
                    if (!w.startTime) return false;
                    const t = new Date(w.startTime).getTime();
                    return !Number.isNaN(t) && t >= cutoff;
                })
                .sort(
                    (a, b) =>
                        new Date(a.startTime).getTime() -
                        new Date(b.startTime).getTime(),
                ),
        [workspaces, cutoff],
    );

    const previousAll = useMemo(
        () =>
            workspaces.filter((w) => {
                if (!w.startTime) return false;
                const t = new Date(w.startTime).getTime();
                return !Number.isNaN(t) && t < cutoff;
            }),
        [workspaces, cutoff],
    );

    const viewerIsTutor = useMemo(
        () => viewerIsTutorAcrossAny(user?.id, [...upcomingAll, ...previousAll]),
        [user?.id, upcomingAll, previousAll],
    );

    const tutees = useMemo(() => {
        const seen = new Set<string>();
        const result: userInfo[] = [];
        [...upcomingAll, ...previousAll].forEach((w) => {
            w.collaboratorIds?.forEach((id) => {
                if (isTutor(id, w)) return;
                if (seen.has(id)) return;
                const u = usersMap[id];
                if (!u) return;
                seen.add(id);
                result.push(u);
            });
        });
        return result;
    }, [upcomingAll, previousAll, usersMap]);

    const upcomingFiltered = useMemo(
        () =>
            applyDashboardFilters(
                upcomingAll,
                upcomingSearch,
                selectedTuteeIds,
                upcomingSortDir,
            ),
        [upcomingAll, upcomingSearch, selectedTuteeIds, upcomingSortDir],
    );

    const previousFiltered = useMemo(
        () =>
            applyDashboardFilters(
                previousAll,
                previousSearch,
                selectedTuteeIds,
                previousSortDir,
            ),
        [previousAll, previousSearch, selectedTuteeIds, previousSortDir],
    );

    const nextWorkspace = upcomingAll[0] ?? null;
    const nextCounterparty = nextWorkspace
        ? pickCounterparty(nextWorkspace, usersMap, viewerIsTutor)
        : null;

    const toggleUpcomingSort = () =>
        setUpcomingSortDir((p) => (p === "asc" ? "desc" : "asc"));
    const togglePreviousSort = () =>
        setPreviousSortDir((p) => (p === "asc" ? "desc" : "asc"));

    return (
        <div className="p-16 flex flex-col gap-16">
            <Next
                workspace={nextWorkspace}
                counterpartyImage={nextCounterparty?.imageUrl ?? null}
                counterpartyName={
                    nextCounterparty
                        ? `${nextCounterparty.firstName} ${nextCounterparty.lastName}`
                        : null
                }
            />
            <div className="flex flex-col gap-8">
                {viewerIsTutor && (
                    <div className="flex items-center justify-between">
                        <Actions />
                        <Filters
                            tutees={tutees}
                            selectedIds={selectedTuteeIds}
                            onChange={setSelectedTuteeIds}
                        />
                    </div>
                )}
                <div className="flex gap-8">
                    <Upcoming
                        workspaces={upcomingFiltered}
                        usersMap={usersMap}
                        viewerIsTutor={viewerIsTutor}
                        search={upcomingSearch}
                        onSearchChange={setUpcomingSearch}
                        sortDir={upcomingSortDir}
                        onToggleSort={toggleUpcomingSort}
                    />
                    <Previous
                        workspaces={previousFiltered}
                        usersMap={usersMap}
                        viewerIsTutor={viewerIsTutor}
                        search={previousSearch}
                        onSearchChange={setPreviousSearch}
                        sortDir={previousSortDir}
                        onToggleSort={togglePreviousSort}
                    />
                </div>
            </div>
        </div>
    );
};

export default DashboardClient;
