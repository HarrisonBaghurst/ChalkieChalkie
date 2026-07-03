"use client";

import React from "react";
import WorkspaceCard from "./WorkspaceCard";
import Filters from "./Filters";
import { userInfo, Workspace } from "@/types/userTypes";
import { pickCounterparty } from "@/lib/dashboardCounterparty";

type PreviousProps = {
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

const Previous = ({
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
}: PreviousProps) => {
    return (
        <div className="w-full bg-card-background rounded-xl pt-5 px-2 pb-2 flex flex-col gap-4 h-fit">
            <p className="text-caption text-foreground-third px-3">PREVIOUS</p>
            <div className="flex gap-4 px-3">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => onChangeSearch(e.target.value)}
                    placeholder="Search previous sessions..."
                    className="w-2/3 border border-foreground-third rounded-md py-2 px-3 text-small placeholder:text-foreground-third focus:outline-none"
                />
                <div className="w-1/3">
                    <Filters
                        collaborators={collaborators}
                        selectedIds={selectedCollaboratorIds}
                        onChange={onChangeSelectedCollaboratorIds}
                    />
                </div>
            </div>
            <div className="flex flex-col gap-2">
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
                            showFeedback={true}
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

export default Previous;
