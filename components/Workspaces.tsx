"use client";

import { useEffect, useMemo, useState } from "react";
import WorkspaceCard from "./WorkspaceCard";
import { userInfo } from "@/types/userTypes";
import { useUser } from "@clerk/nextjs";

const Workspaces = () => {
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [usersInfo, setUsersInfo] = useState<userInfo[] | null>(null);

    const { isLoaded, isSignedIn } = useUser();

    useEffect(() => {
        const fetchWorkspacesAndUsers = async () => {
            try {
                // fetch workspaces
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_APP_URL}/api/get/user-boards`,
                    { cache: "no-store" },
                );

                if (!res.ok) {
                    console.error("Failed to fetch workspaces");
                    return;
                }

                const workspaceData = await res.json();
                setWorkspaces(workspaceData.reverse());

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
                    const usersRes = await fetch("/api/get/users-from-ids", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ userIds: uniqueUserIds }),
                    });

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

    return (
        <div
            id="workspaces"
            className="scroll-target px-[10%] py-20 flex flex-col gap-10 bg-white/1.5 border-y border-y-[#ffffff]/15"
        >
            <h2 className="font-mont-bold text-2xl">Your workspaces</h2>
            {isLoaded && isSignedIn ? (
                <div className="grid grid-cols-3 gap-6">
                    {workspaces.map((workspace, index) => {
                        const collaborators: userInfo[] =
                            workspace.user_ids
                                ?.map((id: string) => usersMap[id])
                                .filter((user: userInfo): user is userInfo =>
                                    Boolean(user),
                                ) || [];

                        return (
                            <WorkspaceCard
                                key={index}
                                title={workspace.title}
                                description={workspace.description}
                                uuid={workspace.id}
                                host={workspace.host_id}
                                collaborators={collaborators}
                                lastEdited={
                                    new Date(workspace.last_activity_at)
                                }
                                loading={loading}
                            />
                        );
                    })}
                </div>
            ) : (
                <div className="text-foreground-second">
                    Sign in or create an account to access workspaces
                </div>
            )}
        </div>
    );
};

export default Workspaces;
