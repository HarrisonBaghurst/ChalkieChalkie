"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { userInfo, UserRole, Workspace } from "@/types/userTypes";
import {
    applyDashboardFilters,
    DASHBOARD_GRACE_MS,
    DashboardFilterState,
    EMPTY_DASHBOARD_FILTERS,
    hasActiveDashboardFilters,
} from "@/lib/dashboardFilters";
import { isHost, viewerIsHostOfAny } from "@/lib/workspaceHost";
import { useUserRole } from "@/hooks/useUserRole";
import { LinkSummary } from "@/types/linkTypes";
import Sidebar from "./Sidebar";
import TabBar from "./mobile/TabBar";
import DashboardShell from "./DashboardShell";
import Next from "./Next";
import WorkspaceLists from "./WorkspaceLists";
import DashboardSkeleton from "./skeletons/DashboardSkeleton";

type DashboardClientProps = {
    // Server-resolved, so the role-gated sidebar is right on first paint.
    role?: UserRole;
    testData?: {
        workspaces: Workspace[];
        users: userInfo[];
    };
};

// TODO(refactor): duplicates the fetching and snake_case mapping in
// components/Workspaces.tsx; extract a shared API client.
const DashboardClient = ({
    role: serverRole,
    testData,
}: DashboardClientProps = {}) => {
    const { isLoaded, isSignedIn, user } = useUser();
    const clientRole = useUserRole();
    const role = serverRole ?? clientRole;

    const [workspaces, setWorkspaces] = useState<Workspace[]>(
        testData?.workspaces ?? [],
    );
    const [usersInfo, setUsersInfo] = useState<userInfo[]>(
        testData?.users ?? [],
    );
    const [friends, setFriends] = useState<userInfo[]>([]);
    const [loading, setLoading] = useState(!testData);

    const [filters, setFilters] = useState<DashboardFilterState>(
        EMPTY_DASHBOARD_FILTERS,
    );

    const now = useMemo(() => new Date(), []);

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;
        if (testData) return;

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
                const fetched: userInfo[] = data.friends ?? [];
                setFriends(fetched);
                // Resolves a linked person before they appear in any user_ids.
                mergeUsers(fetched);
            } catch (err) {
                console.error(err);
            }
        };
        fetchFriends();

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
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, [isLoaded, isSignedIn, role, testData]);

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

    const viewerIsHost = useMemo(
        () => viewerIsHostOfAny(user?.id, [...upcomingAll, ...previousAll]),
        [user?.id, upcomingAll, previousAll],
    );

    // Union, not replacement: a new link with no workspaces yet and an
    // unlinked past collaborator both have to stay filterable.
    const collaborators = useMemo(() => {
        const seen = new Set<string>(friends.map((f) => f.id));
        const result: userInfo[] = [...friends];
        [...upcomingAll, ...previousAll].forEach((w) => {
            w.collaboratorIds?.forEach((id) => {
                if (isHost(id, w)) return;
                if (seen.has(id)) return;
                const u = usersMap[id];
                if (!u) return;
                seen.add(id);
                result.push(u);
            });
        });
        return result;
    }, [friends, upcomingAll, previousAll, usersMap]);

    const upcomingFiltered = useMemo(
        () => applyDashboardFilters(upcomingAll, filters, "asc"),
        [upcomingAll, filters],
    );

    const previousFiltered = useMemo(
        () => applyDashboardFilters(previousAll, filters, "desc"),
        [previousAll, filters],
    );

    const activeFilters = hasActiveDashboardFilters(filters);

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
        setWorkspaces((prev) => prev.map((w) => (w.id === ws.id ? ws : w)));
        mergeUsers(collaborators);
    };

    const handleDeleted = (id: string) => {
        setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    };

    const handleLinked = (link: LinkSummary) => {
        setFriends((prev) => [
            link.counterparty,
            ...prev.filter((f) => f.id !== link.counterparty.id),
        ]);
        mergeUsers([link.counterparty]);
    };

    return (
        <DashboardShell
            sidebar={
                <Sidebar
                    friends={friends}
                    onCreated={handleCreated}
                    onLinked={handleLinked}
                    role={serverRole}
                />
            }
            bottomBar={
                <TabBar
                    friends={friends}
                    onCreated={handleCreated}
                    onLinked={handleLinked}
                    role={serverRole}
                />
            }
        >
            {loading || !isLoaded ? (
                <DashboardSkeleton />
            ) : (
                <>
                    <div className="flex flex-col gap-1">
                        <p className="text-heading font-inter-bold">
                            Your Dashboard
                        </p>
                        <p className="text-foreground-second">
                            View and update your workspaces
                        </p>
                    </div>
                    <Next
                        workspace={nextWorkspace}
                        usersMap={usersMap}
                        viewerIsHost={viewerIsHost}
                    />
                    <WorkspaceLists
                        upcoming={upcomingFiltered}
                        previous={previousFiltered}
                        usersMap={usersMap}
                        collaborators={collaborators}
                        filters={filters}
                        hasActiveFilters={activeFilters}
                        onChangeSearch={(search) =>
                            setFilters((f) => ({ ...f, search }))
                        }
                        onChangeCollaboratorIds={(collaboratorIds) =>
                            setFilters((f) => ({ ...f, collaboratorIds }))
                        }
                        onClearFilters={() =>
                            setFilters(EMPTY_DASHBOARD_FILTERS)
                        }
                        friends={friends}
                        onWorkspaceUpdated={handleUpdated}
                        onWorkspaceDeleted={handleDeleted}
                    />
                </>
            )}
        </DashboardShell>
    );
};

export default DashboardClient;
