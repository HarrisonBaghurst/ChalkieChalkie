"use client";

import React, { useMemo, useState } from "react";
import WorkspaceControls, { TabId } from "./WorkspaceControls";
import WorkspaceTable, { WorkspaceRow } from "./WorkspaceTable";
import WorkspaceList from "./mobile/WorkspaceList";
import { userInfo, Workspace } from "@/types/userTypes";
import { DashboardFilterState } from "@/lib/dashboardFilters";

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

    const tabs: { id: TabId; label: string; count: number }[] = [
        { id: "upcoming", label: "Upcoming", count: upcomingRows.length },
        { id: "previous", label: "Previous", count: previousRows.length },
        { id: "all", label: "All", count: rowsByTab.all.length },
    ];

    const controls = (
        <WorkspaceControls
            tabs={tabs}
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            collaborators={collaborators}
            filters={filters}
            hasActiveFilters={hasActiveFilters}
            onChangeSearch={onChangeSearch}
            onChangeCollaboratorIds={onChangeCollaboratorIds}
            onClearFilters={onClearFilters}
        />
    );

    return (
        <div className="w-full min-w-0 h-fit">
            <div className="flex flex-col gap-4 md:hidden">
                {controls}
                <WorkspaceList
                    rows={rowsByTab[activeTab]}
                    usersMap={usersMap}
                    friends={friends}
                    onWorkspaceUpdated={onWorkspaceUpdated}
                    onWorkspaceDeleted={onWorkspaceDeleted}
                />
            </div>
            <div className="hidden md:block">
                <WorkspaceTable
                    rows={rowsByTab[activeTab]}
                    usersMap={usersMap}
                    friends={friends}
                    toolbar={controls}
                    onWorkspaceUpdated={onWorkspaceUpdated}
                    onWorkspaceDeleted={onWorkspaceDeleted}
                />
            </div>
        </div>
    );
};

export default WorkspaceLists;
