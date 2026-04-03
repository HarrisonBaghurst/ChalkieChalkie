"use client";

import { useEffect, useMemo, useState } from "react";
import WorkspaceCard from "./WorkspaceCard";
import { userInfo, Workspace, WorkspaceEditData } from "@/types/userTypes";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import Button from "./Button";
import Combobox from "./Combobox";

// TYPES ------------------------------------------------------------------------------------------

type SortDirection = "asc" | "desc";

type TimeFilter = "upcoming" | "passed" | "next" | null;

interface Filters {
    search: string;
    collaboratorIds: string[];
    time: TimeFilter;
}

// CONSTANTS --------------------------------------------------------------------------------------

const DEFAULT_FILTERS: Filters = {
    search: "",
    collaboratorIds: [],
    time: null,
};

const GRACE_MS = 15 * 60 * 1000; // 15 mins

// FILTER & SORT ----------------------------------------------------------------------------------

const isUpcoming = (startTime: Date | null, now: Date): boolean => {
    if (!startTime) return false;

    return startTime.getTime() >= now.getTime() - GRACE_MS;
};

const isPassed = (startTime: Date | null, now: Date): boolean => {
    if (!startTime) return false;

    return startTime.getTime() < now.getTime();
};

const applyFiltersAndSort = (
    workspaces: Workspace[],
    filters: Filters,
    sortDir: SortDirection,
    currentUserId: string | undefined | null,
    now: Date,
): Workspace[] => {
    let result = [...workspaces];

    // search - case insensitive
    if (filters.search.trim()) {
        const query = filters.search.trim().toLowerCase();
        result = result.filter((workspace) =>
            workspace.title?.toLowerCase().includes(query),
        );
    }

    // filter selected collaborators
    if (filters.collaboratorIds.length > 0) {
        result = result.filter((workspace) =>
            filters.collaboratorIds.some((id) =>
                workspace.collaboratorIds?.includes(id),
            ),
        );
    }

    // filter time
    if (filters.time === "upcoming") {
        result = result.filter((workspace) =>
            isUpcoming(new Date(workspace.startTime), now),
        );
    } else if (filters.time === "passed") {
        result = result.filter((workspace) =>
            isPassed(new Date(workspace.startTime), now),
        );
    } else if (filters.time === "next") {
        const future = result
            .filter((workspace) =>
                isUpcoming(new Date(workspace.startTime), now),
            )
            .sort(
                (a, b) =>
                    new Date(a.startTime!).getTime() -
                    new Date(b.startTime!).getTime(),
            );

        result = future.length > 0 ? [future[0]] : [];
    }

    // sort by start time - nulls last
    result.sort((a, b) => {
        if (!a.startTime && !b.startTime) return 0;
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        const diff =
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        return sortDir === "asc" ? diff : -diff;
    });

    return result;
};

// MAIN COMPONENT ---------------------------------------------------------------------------------

const Workspaces = () => {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [usersInfo, setUsersInfo] = useState<userInfo[] | null>(null);

    const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
    const [sortDir, setSortDir] = useState<SortDirection>("asc");

    const { isLoaded, isSignedIn, user } = useUser();
    const router = useRouter();

    const now = useMemo(() => new Date(), []);

    const createBoard = () => {
        const id = uuidv4();
        router.push(`/board/${id}`);
    };

    const handleWorkspaceUpdate = (
        id: string,
        updated: Partial<WorkspaceEditData>,
    ) => {
        setWorkspaces((prev) =>
            prev.map((ws) =>
                ws.id === id
                    ? {
                          ...ws,
                          title: updated.title ?? ws.title,
                          description: updated.description ?? ws.description,
                          collaboratorIds: updated.collaborators
                              ? updated.collaborators.map((c) => c.id)
                              : ws.collaboratorIds,
                          startTime:
                              updated.startTime !== undefined
                                  ? (updated.startTime?.toISOString() ??
                                    ws.startTime)
                                  : ws.startTime,
                      }
                    : ws,
            ),
        );
    };

    useEffect(() => {
        const fetchWorkspacesAndUsers = async () => {
            try {
                // fetch workspaces
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_APP_URL}/api/users/workspaces`,
                    { cache: "no-store" },
                );

                if (!res.ok) {
                    console.error("Failed to fetch workspaces");
                    return;
                }

                const workspaceData = await res.json();
                const mapped = workspaceData.map((ws: any) => ({
                    ...ws,
                    collaboratorIds: ws.user_ids,
                    host: ws.host_id,
                    startTime: ws.start_time,
                }));
                setWorkspaces(mapped);

                // extract unique user IDs
                const userIdSet = new Set<string>();

                workspaceData.forEach((ws: any) => {
                    if (ws.host_id) {
                        userIdSet.add(ws.host_id);
                    }

                    if (Array.isArray(ws.user_ids)) {
                        ws.user_ids.forEach((id: string) => userIdSet.add(id));
                    }
                });

                const uniqueUserIds = Array.from(userIdSet);

                // fetch unique users
                if (uniqueUserIds.length > 0) {
                    const usersRes = await fetch(
                        `${process.env.NEXT_PUBLIC_APP_URL}/api/users/batch`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ userIds: uniqueUserIds }),
                        },
                    );

                    if (!usersRes.ok) {
                        console.error("Failed to fetch users");
                        return;
                    }

                    const usersData = await usersRes.json();
                    setUsersInfo(usersData.users);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (isLoaded && isSignedIn) {
            fetchWorkspacesAndUsers();
        }
    }, [isLoaded, isSignedIn]);

    const usersMap = useMemo(() => {
        if (!usersInfo) return {};
        return Object.fromEntries(usersInfo.map((user) => [user.id, user]));
    }, [usersInfo]);

    const availableCollaborators = useMemo(() => {
        const seen = new Set<string>();
        const result: userInfo[] = [];
        workspaces.forEach((workspace) => {
            workspace.collaboratorIds?.forEach((id) => {
                if (id !== user?.id && !seen.has(id) && usersMap[id]) {
                    seen.add(id);
                    result.push(usersMap[id]);
                }
            });
        });
        return result;
    }, [workspaces, usersMap, user?.id]);

    const filteredWorkspaces = useMemo(
        () => applyFiltersAndSort(workspaces, filters, sortDir, user?.id, now),
        [workspaces, filters, sortDir, user?.id, now],
    );

    const toggleCollaborator = (id: string) => {
        setFilters((prev) => ({
            ...prev,
            collaboratorIds: prev.collaboratorIds.includes(id)
                ? prev.collaboratorIds.filter((c) => c !== id)
                : [...prev.collaboratorIds, id],
        }));
    };

    const setTimeFilter = (value: TimeFilter) =>
        setFilters((prev) => ({ ...prev, time: value }));

    const toggleSortDir = () =>
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));

    const hasActiveFilters =
        !!filters.search ||
        filters.collaboratorIds.length > 0 ||
        filters.time !== null;

    const clearFilters = () => {
        setFilters(DEFAULT_FILTERS);
        setSortDir("asc");
    };

    return (
        <div
            id="workspaces"
            className="relative scroll-target px-[10%] py-32 flex flex-col gap-12 bg-[#0d0d0a] my-32 min-h-120"
        >
            <div className="absolute bg-linear-to-b from-background to bg-[#0d0d0a] top-0 left-0 w-full h-20" />
            <div className="absolute bg-linear-to-t from-background to bg-[#0d0d0a] bottom-0 left-0 w-full h-20" />

            <div className="flex items-center justify-between">
                <div className="flex gap-4 items-center">
                    <h2 className="font-poppins-light text-xl text-foreground-second">
                        Your workspaces
                    </h2>
                    {isSignedIn && (
                        <div
                            className="relative w-6 h-6 cursor-pointer"
                            onClick={createBoard}
                        >
                            <Image
                                src={"/icons/plus-circle.svg"}
                                alt="Create new"
                                fill
                            />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <Button
                        text={
                            sortDir === "asc"
                                ? "Date Ascending"
                                : "Date Descending"
                        }
                        handleClick={() => toggleSortDir()}
                        variant="secondary"
                        size="small"
                    />
                    <Combobox value={filters.time} onChange={setTimeFilter} />
                </div>
            </div>
            {isLoaded && isSignedIn && filteredWorkspaces.length > 0 ? (
                <div className="grid grid-cols-3 gap-12">
                    {filteredWorkspaces.map((workspace, _) => {
                        const collaborators: userInfo[] =
                            workspace.collaboratorIds
                                ?.map((id: string) => usersMap[id])
                                .filter((user: userInfo): user is userInfo =>
                                    Boolean(user),
                                ) || [];

                        return (
                            <WorkspaceCard
                                key={workspace.id}
                                title={workspace.title}
                                description={workspace.description}
                                uuid={workspace.id}
                                host={workspace.host}
                                collaborators={collaborators}
                                lastEdited={new Date(workspace.lastActivity)}
                                loading={loading}
                                startTime={
                                    workspace.startTime
                                        ? new Date(workspace.startTime)
                                        : null
                                }
                                onUpdate={(updated) =>
                                    handleWorkspaceUpdate(workspace.id, updated)
                                }
                            />
                        );
                    })}
                </div>
            ) : isLoaded && isSignedIn ? (
                <div>No workspaces matching filters</div>
            ) : (
                <div className="text-foreground-third">
                    Sign in or create an account to access workspaces
                </div>
            )}
        </div>
    );
};

export default Workspaces;
