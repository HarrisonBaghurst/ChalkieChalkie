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
            {/* Free-floating control row, disconnected from the list below
                (mirrors the reference layout). One column on a phone — tabs,
                then a full-width search, then the filters sheet; at lg it
                becomes the original single row, tabs left and controls right. */}
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-4">
                <Tabs
                    value={activeTab}
                    onValueChange={(id) => setActiveTab(id as TabId)}
                    className="w-full lg:w-auto"
                >
                    {/* Full width on a phone so the three triggers, which are
                        already flex-1, split the row evenly instead of
                        huddling at the left edge. */}
                    <TabsList className="w-full lg:w-fit">
                        {tabs.map((tab) => (
                            <TabsTrigger key={tab.id} value={tab.id}>
                                <span className="text-small">{tab.label}</span>
                                {/* Count sits one step dimmer than its label,
                                    in both the active and inactive state. */}
                                <span className="text-small text-foreground-third [[data-state=active]>&]:text-foreground-second">
                                    {tab.count}
                                </span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    {/* Sits in the control row beside the tabs and filters, so
                        it takes the filled `.control-surface` chrome rather
                        than the bare-field default. `border-border` restates
                        that same hairline as a utility, since Input's own
                        border colour would otherwise outrank it. */}
                    <Input
                        type="text"
                        value={filters.search}
                        onChange={(e) => onChangeSearch(e.target.value)}
                        placeholder="Search sessions..."
                        className="w-full lg:w-56 control-surface border-border"
                    />
                    {/* The popover filter and clear button together overflow a
                        phone's width, so below lg they collapse into one
                        sheet. */}
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

            {/* Two renderings of the same rows, swapped by CSS rather than a
                media-query hook: no hydration mismatch and no first-paint
                flash. */}
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
