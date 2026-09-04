"use client";

import React, { useMemo, useState } from "react";
import Filters from "./Filters";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import WorkspaceTable, { WorkspaceRow } from "./WorkspaceTable";
import WorkspaceList from "./mobile/WorkspaceList";
import FiltersSheet from "./mobile/FiltersSheet";
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

    // Bucket-tagged so the "All" tab can carry both sets in one list.
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

    const tabs = [
        { id: "upcoming", label: "Upcoming", count: upcomingRows.length },
        { id: "previous", label: "Previous", count: previousRows.length },
        { id: "all", label: "All", count: rowsByTab.all.length },
    ];

    return (
        <div className="w-full flex flex-col gap-4 h-fit">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-4">
                <Tabs
                    value={activeTab}
                    onValueChange={(id) => setActiveTab(id as TabId)}
                    className="w-full lg:w-auto"
                >
                    <TabsList className="w-full lg:w-fit">
                        {tabs.map((tab) => (
                            <TabsTrigger key={tab.id} value={tab.id}>
                                <span className="text-small">{tab.label}</span>
                                <span className="text-small text-foreground-third [[data-state=active]>&]:text-foreground-second">
                                    {tab.count}
                                </span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <Input
                        type="text"
                        variant="control"
                        value={filters.search}
                        onChange={(e) => onChangeSearch(e.target.value)}
                        placeholder="Search sessions..."
                        className="w-full lg:w-56"
                    />
                    <div className="lg:hidden">
                        <FiltersSheet
                            collaborators={collaborators}
                            selectedIds={filters.collaboratorIds}
                            onChange={onChangeCollaboratorIds}
                            hasActiveFilters={hasActiveFilters}
                            onClearFilters={onClearFilters}
                        />
                    </div>
                    <div className="hidden lg:flex lg:items-center lg:gap-3">
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
            </div>

            <div className="lg:hidden">
                <WorkspaceList
                    rows={rowsByTab[activeTab]}
                    usersMap={usersMap}
                    friends={friends}
                    onWorkspaceUpdated={onWorkspaceUpdated}
                    onWorkspaceDeleted={onWorkspaceDeleted}
                />
            </div>
            <div className="hidden lg:block">
                <WorkspaceTable
                    rows={rowsByTab[activeTab]}
                    usersMap={usersMap}
                    friends={friends}
                    onWorkspaceUpdated={onWorkspaceUpdated}
                    onWorkspaceDeleted={onWorkspaceDeleted}
                />
            </div>
        </div>
    );
};

export default WorkspaceLists;
