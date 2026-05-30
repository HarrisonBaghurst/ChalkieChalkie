"use client";

import React from "react";
import WorkspaceCard from "./WorkspaceCard";
import { userInfo, Workspace } from "@/types/userTypes";
import { SortDirection } from "@/lib/dashboardFilters";
import { isTutor } from "@/lib/roleStub";

interface PreviousProps {
    workspaces: Workspace[];
    usersMap: Record<string, userInfo>;
    viewerIsTutor: boolean;
    search: string;
    onSearchChange: (s: string) => void;
    sortDir: SortDirection;
    onToggleSort: () => void;
}

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

const Previous = ({
    workspaces,
    usersMap,
    viewerIsTutor,
    search,
    onSearchChange,
    sortDir,
    onToggleSort,
}: PreviousProps) => {
    return (
        <div className="w-full rounded-2xl py-6 px-6 border-2 border-white/5 bg-white/3 h-fit">
            <div className="flex flex-col gap-6">
                <div className="text-foreground-third">PREVIOUS SESSIONS</div>
                <div className="flex gap-4 items-center">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search"
                        className="border-2 border-white/5 rounded-md h-10 w-full px-2.5 outline-none focus:border-white/15"
                    />
                    <button
                        onClick={onToggleSort}
                        className="border-2 h-10 border-white/5 rounded-md flex items-center px-2.5 cursor-pointer whitespace-nowrap"
                    >
                        {sortDir === "asc" ? "Ascending" : "Descending"}
                    </button>
                </div>
                <div className="flex flex-col gap-3 w-full">
                    {workspaces.length === 0 ? (
                        <>
                            <div className="w-full bg-white/5 h-0.5" />
                            <div className="text-foreground-third text-sm">
                                No sessions
                            </div>
                        </>
                    ) : (
                        workspaces.map((workspace) => {
                            const counterparty = pickCounterparty(
                                workspace,
                                usersMap,
                                viewerIsTutor,
                            );
                            return (
                                <div
                                    key={workspace.id}
                                    className="flex flex-col gap-3"
                                >
                                    <div className="w-full bg-white/5 h-0.5" />
                                    <WorkspaceCard
                                        workspace={workspace}
                                        counterpartyImage={
                                            counterparty?.imageUrl ?? null
                                        }
                                        counterpartyName={
                                            counterparty
                                                ? `${counterparty.firstName} ${counterparty.lastName}`
                                                : null
                                        }
                                    />
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default Previous;
