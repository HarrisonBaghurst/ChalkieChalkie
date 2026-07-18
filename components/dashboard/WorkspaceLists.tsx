"use client";

import React, { useMemo, useState } from "react";
import Filters from "./Filters";
import Tabs, { TabItem } from "../Tabs";
import WorkspaceTable, { WorkspaceRow } from "./WorkspaceTable";
import { userInfo, Workspace } from "@/types/userTypes";
import { DashboardFilterState } from "@/lib/dashboardFilters";
import { cn } from "@/lib/utils";

type TabId = "upcoming" | "previous" | "all";

type WorkspaceListsProps = {
    upcoming: Workspace[];
    previous: Workspace[];
    usersMap: Record<string, userInfo>;
    collaborators: userInfo[];
    filters: DashboardFilterState;
    hasActiveFilters: boolean;
    onChangeSearch: (search: string) => void;
    onChangeCollaboratorIds: (ids: string[]) => void;
    onClearFilters: () => void;
    friends: userInfo[];
    onWorkspaceUpdated: (
        workspace: Workspace,
        collaborators: userInfo[],
    ) => void;
    onWorkspaceDeleted: (workspaceId: string) => void;
};

const WorkspaceLists = ({
    upcoming,
    previous,
    usersMap,
    collaborators,
    filters,
    hasActiveFilters,
    onChangeSearch,
    onChangeCollaboratorIds,
    onClearFilters,
    friends,
    onWorkspaceUpdated,
    onWorkspaceDeleted,
}: WorkspaceListsProps) => {
    const [activeTab, setActiveTab] = useState<TabId>("upcoming");

    // Tag each workspace with its bucket so the table can derive status and so
    // the "All" tab can carry both sets in one list (upcoming first, then past).
    const upcomingRows = useMemo<WorkspaceRow[]>(
        () => upcoming.map((w) => ({ workspace: w, bucket: "upcoming" })),
        [upcoming],
    );
    const previousRows = useMemo<WorkspaceRow[]>(
        () => previous.map((w) => ({ workspace: w, bucket: "previous" })),
        [previous],
    );

    const rowsByTab: Record<TabId, WorkspaceRow[]> = {
        upcoming: upcomingRows,
        previous: previousRows,
        all: [...upcomingRows, ...previousRows],
    };

    const tabs: TabItem[] = [
        { id: "upcoming", label: "Upcoming", count: upcomingRows.length },
        { id: "previous", label: "Previous", count: previousRows.length },
        { id: "all", label: "All", count: rowsByTab.all.length },
    ];

    return (
        <div className="w-full flex flex-col gap-4 h-fit">
            {/* Free-floating control row: tabs on the left, shared search /
                member filter / clear on the right, disconnected from the table
                below (mirrors the reference layout). */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <Tabs
                    tabs={tabs}
                    activeId={activeTab}
                    onChange={(id) => setActiveTab(id as TabId)}
                />
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => onChangeSearch(e.target.value)}
                        placeholder="Search sessions..."
                        className="w-56 control-surface py-2 px-3 text-small placeholder:text-foreground-third focus:outline-none"
                    />
                    <Filters
                        collaborators={collaborators}
                        selectedIds={filters.collaboratorIds}
                        onChange={onChangeCollaboratorIds}
                    />
                    <button
                        type="button"
                        onClick={onClearFilters}
                        disabled={!hasActiveFilters}
                        className={cn(
                            "control-surface text-foreground-third py-2 px-3 text-small whitespace-nowrap cursor-pointer",
                            hasActiveFilters
                                ? "hover:bg-card-background-hover"
                                : "cursor-not-allowed opacity-60",
                        )}
                    >
                        Clear filters
                    </button>
                </div>
            </div>

            <WorkspaceTable
                rows={rowsByTab[activeTab]}
                usersMap={usersMap}
                friends={friends}
                onWorkspaceUpdated={onWorkspaceUpdated}
                onWorkspaceDeleted={onWorkspaceDeleted}
            />
        </div>
    );
};

export default WorkspaceLists;
