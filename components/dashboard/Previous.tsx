"use client";

import React from "react";
import WorkspaceCard from "./WorkspaceCard";
import Filters from "./Filters";
import { userInfo, Workspace } from "@/types/userTypes";
import { pickCounterparty } from "@/lib/dashboardCounterparty";

type PreviousProps = {
    workspaces: Workspace[];
    usersMap: Record<string, userInfo>;
    viewerIsTutor: boolean;
    tutees: userInfo[];
    selectedTuteeIds: string[];
    onChangeSelectedTuteeIds: (ids: string[]) => void;
    search: string;
    onChangeSearch: (s: string) => void;
};

const Previous = ({
    workspaces,
    usersMap,
    viewerIsTutor,
    tutees,
    selectedTuteeIds,
    onChangeSelectedTuteeIds,
    search,
    onChangeSearch,
}: PreviousProps) => {
    return (
        <div className="w-1/2 bg-card-background rounded-xl p-4 flex flex-col gap-4 h-fit">
            <p className="text-xs text-foreground-third font-inter-bold">
                PREVIOUS
            </p>
            <div className="flex gap-4">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => onChangeSearch(e.target.value)}
                    placeholder="Search previous sessions..."
                    className="w-2/3 border border-foreground-third rounded-md py-2 px-3 text-sm placeholder:text-foreground-third focus:outline-none"
                />
                <div className="w-1/3">
                    <Filters
                        tutees={tutees}
                        selectedIds={selectedTuteeIds}
                        onChange={onChangeSelectedTuteeIds}
                    />
                </div>
            </div>
            <div className="flex flex-col gap-4">
                {workspaces.length === 0 ? (
                    <p className="text-xs text-foreground-third">No sessions</p>
                ) : (
                    workspaces.map((w) => (
                        <WorkspaceCard
                            key={w.id}
                            workspace={w}
                            tutee={pickCounterparty(w, usersMap, viewerIsTutor)}
                            showFeedback={true}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default Previous;
