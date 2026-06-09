"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { userInfo, Workspace } from "@/types/userTypes";
import {
    applyDashboardFilters,
    DASHBOARD_GRACE_MS,
} from "@/lib/dashboardFilters";
import { isTutor, viewerIsTutorAcrossAny } from "@/lib/roleStub";
import { useUserRole } from "@/hooks/useUserRole";
import Sidebar from "./Sidebar";
import Next from "./Next";
import Actions from "./Actions";
import Upcoming from "./Upcoming";
import Previous from "./Previous";

const DashboardClient = () => {
    const { isLoaded, isSignedIn, user } = useUser();
    const role = useUserRole();

    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [usersInfo, setUsersInfo] = useState<userInfo[]>([]);
    const [friends, setFriends] = useState<userInfo[]>([]);

    const [selectedTuteeIds, setSelectedTuteeIds] = useState<string[]>([]);
    const [upcomingSearch, setUpcomingSearch] = useState("");
    const [previousSearch, setPreviousSearch] = useState("");

    const now = useMemo(() => new Date(), []);

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;

        if (role === "tutor") {
            const fetchFriends = async () => {
                try {
                    const res = await fetch(
                        `${process.env.NEXT_PUBLIC_APP_URL}/api/users/friends`,
                    );
                    if (!res.ok) {
                        console.error("Failed to fetch friends");
                        return;
                    }
                    const data = await res.json();
                    setFriends(data.friends ?? []);
                } catch (err) {
                    console.error(err);
                }
            };
            fetchFriends();
        }

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
                    feedback?: string | null;
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
                    feedback: ws.feedback ?? undefined,
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
    }, [isLoaded, isSignedIn, role]);

    const usersMap = useMemo(
        () => Object.fromEntries(usersInfo.map((u) => [u.id, u])),
        [usersInfo],
    );

    const cutoff = now.getTime() - DASHBOARD_GRACE_MS;

    const upcomingAll = useMemo(
        () =>
            workspaces
                .filter((w) => {
                    if (!w.startTime) return true;
                    const t = new Date(w.startTime).getTime();
                    if (Number.isNaN(t)) return true;
                    return t >= cutoff;
                })
                .sort((a, b) => {
                    const aT = a.startTime
                        ? new Date(a.startTime).getTime()
                        : NaN;
                    const bT = b.startTime
                        ? new Date(b.startTime).getTime()
                        : NaN;
                    const aValid = !Number.isNaN(aT);
                    const bValid = !Number.isNaN(bT);
                    if (aValid && !bValid) return -1;
                    if (!aValid && bValid) return 1;
                    if (!aValid && !bValid) return 0;
                    return aT - bT;
                }),
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
        () =>
            viewerIsTutorAcrossAny(user?.id, [...upcomingAll, ...previousAll]),
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
                "asc",
            ),
        [upcomingAll, upcomingSearch, selectedTuteeIds],
    );

    const previousFiltered = useMemo(
        () =>
            applyDashboardFilters(
                previousAll,
                previousSearch,
                selectedTuteeIds,
                "desc",
            ),
        [previousAll, previousSearch, selectedTuteeIds],
    );

    const nextWorkspace = upcomingAll[0] ?? null;

    const mergeUsers = (incoming: userInfo[]) => {
        setUsersInfo((prev) => {
            const byId = new Map(prev.map((u) => [u.id, u]));
            incoming.forEach((u) => byId.set(u.id, u));
            return Array.from(byId.values());
        });
    };

    const handleCreated = (ws: Workspace, collaborators: userInfo[]) => {
        setWorkspaces((prev) => [...prev, ws]);
        mergeUsers(collaborators);
    };

    const handleUpdated = (ws: Workspace, collaborators: userInfo[]) => {
        setWorkspaces((prev) =>
            prev.map((w) => (w.id === ws.id ? ws : w)),
        );
        mergeUsers(collaborators);
    };

    return (
        <div className="flex">
            <Sidebar />
            <div className="ml-75 w-full h-full p-16 flex flex-col gap-6">
                <Next workspace={nextWorkspace} />
                <Actions friends={friends} onCreated={handleCreated} />
                <div className="h-px w-full bg-foreground-third" />
                <div className="flex gap-6 w-full">
                    <Upcoming
                        workspaces={upcomingFiltered}
                        usersMap={usersMap}
                        viewerIsTutor={viewerIsTutor}
                        tutees={tutees}
                        selectedTuteeIds={selectedTuteeIds}
                        onChangeSelectedTuteeIds={setSelectedTuteeIds}
                        search={upcomingSearch}
                        onChangeSearch={setUpcomingSearch}
                        friends={friends}
                        onWorkspaceUpdated={handleUpdated}
                    />
                    <Previous
                        workspaces={previousFiltered}
                        usersMap={usersMap}
                        viewerIsTutor={viewerIsTutor}
                        tutees={tutees}
                        selectedTuteeIds={selectedTuteeIds}
                        onChangeSelectedTuteeIds={setSelectedTuteeIds}
                        search={previousSearch}
                        onChangeSearch={setPreviousSearch}
                        friends={friends}
                        onWorkspaceUpdated={handleUpdated}
                    />
                </div>
            </div>
        </div>
    );
};

export default DashboardClient;
