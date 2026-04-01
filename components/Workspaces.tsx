"use client";

import { useEffect, useMemo, useState } from "react";
import WorkspaceCard from "./WorkspaceCard";
import { userInfo, Workspace } from "@/types/userTypes";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

const Workspaces = () => {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [usersInfo, setUsersInfo] = useState<userInfo[] | null>(null);

    const { isLoaded, isSignedIn } = useUser();

    const router = useRouter();

    const createBoard = () => {
        const id = uuidv4();
        router.push(`/board/${id}`);
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

    return (
        <div
            id="workspaces"
            className="scroll-target px-[10%] py-32 flex flex-col gap-12"
        >
            <div className="flex gap-4 items-center">
                <h2 className="font-poppins-light text-xl text-foreground-second">
                    Your workspaces
                </h2>
                <div
                    className="relative w-8 h-8 cursor-pointer"
                    onClick={createBoard}
                >
                    <Image
                        src={"/icons/plus-circle.svg"}
                        alt="Create new"
                        fill
                    />
                </div>
            </div>
            {isLoaded && isSignedIn ? (
                <div className="grid grid-cols-3 gap-12">
                    {workspaces.map((workspace, index) => {
                        const collaborators: userInfo[] =
                            workspace.collaboratorIds
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
                                host={workspace.host}
                                collaborators={collaborators}
                                lastEdited={new Date(workspace.lastActivity)}
                                loading={loading}
                                startTime={
                                    workspace.startTime
                                        ? new Date(workspace.startTime)
                                        : null
                                }
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
