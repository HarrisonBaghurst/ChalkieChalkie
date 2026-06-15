"use client";

import React from "react";
import WorkspaceCard from "./WorkspaceCard";
import Filters from "./Filters";
import { userInfo, Workspace } from "@/types/userTypes";
import { pickCounterparty } from "@/lib/dashboardCounterparty";

type UpcomingProps = {
    workspaces: Workspace[];
    usersMap: Record<string, userInfo>;
    viewerIsHost: boolean;
    collaborators: userInfo[];
    selectedCollaboratorIds: string[];
    onChangeSelectedCollaboratorIds: (ids: string[]) => void;
    search: string;
    onChangeSearch: (s: string) => void;
    friends: userInfo[];
    onWorkspaceUpdated: (
        workspace: Workspace,
        collaborators: userInfo[],
    ) => void;
    onWorkspaceDeleted: (workspaceId: string) => void;
};

const Upcoming = ({
    workspaces,
    usersMap,
    viewerIsHost,
    collaborators,
    selectedCollaboratorIds,
    onChangeSelectedCollaboratorIds,
    search,
    onChangeSearch,
    friends,
    onWorkspaceUpdated,
    onWorkspaceDeleted,
}: UpcomingProps) => {
    return (
        <div className="w-full bg-card-background rounded-xl p-4 flex flex-col gap-4 h-fit">
            <p className="text-caption text-foreground-third font-inter-bold">
                UPCOMING
            </p>
            <div className="flex gap-4">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => onChangeSearch(e.target.value)}
                    placeholder="Search upcoming sessions..."
                    className="w-2/3 border border-foreground-third rounded-md py-2 px-3 text-secondary placeholder:text-foreground-third focus:outline-none"
                />
                <div className="w-1/3">
                    <Filters
                        collaborators={collaborators}
                        selectedIds={selectedCollaboratorIds}
                        onChange={onChangeSelectedCollaboratorIds}
                    />
                </div>
            </div>
            <div className="flex flex-col gap-4">
                {workspaces.length === 0 ? (
                    <p className="text-caption text-foreground-third">
                        No sessions
                    </p>
                ) : (
                    workspaces.map((w) => (
                        <WorkspaceCard
                            key={w.id}
                            workspace={w}
                            counterparty={pickCounterparty(
                                w,
                                usersMap,
                                viewerIsHost,
                            )}
                            showFeedback={false}
                            usersMap={usersMap}
                            friends={friends}
                            onUpdated={onWorkspaceUpdated}
                            onDeleted={onWorkspaceDeleted}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default Upcoming;
