"use client";

import Filters from "./Filters";
import DensityMenu from "./DensityMenu";
import FiltersSheet from "./mobile/FiltersSheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { userInfo } from "@/types/userTypes";
import { DashboardFilterState } from "@/lib/dashboardFilters";
import { cn } from "@/lib/utils";

export type TabId = "upcoming" | "previous" | "all";

type WorkspaceControlsProps = {
    tabs: { id: TabId; label: string; count: number }[];
    activeTab: TabId;
    onChangeTab: (id: TabId) => void;
    collaborators: userInfo[];
    filters: DashboardFilterState;
    hasActiveFilters: boolean;
    onChangeSearch: (search: string) => void;
    onChangeCollaboratorIds: (ids: string[]) => void;
    onClearFilters: () => void;
};

const WorkspaceControls = ({
    tabs,
    activeTab,
    onChangeTab,
    collaborators,
    filters,
    hasActiveFilters,
    onChangeSearch,
    onChangeCollaboratorIds,
    onClearFilters,
}: WorkspaceControlsProps) => {
    return (
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-4">
            <Tabs
                value={activeTab}
                onValueChange={(id) => onChangeTab(id as TabId)}
                className="w-full md:w-auto"
            >
                <TabsList className="w-full md:w-fit">
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
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <Input
                    type="text"
                    variant="control"
                    value={filters.search}
                    onChange={(e) => onChangeSearch(e.target.value)}
                    placeholder="Search sessions..."
                    className="w-full md:w-56"
                />
                <div className="md:hidden">
                    <FiltersSheet
                        collaborators={collaborators}
                        selectedIds={filters.collaboratorIds}
                        onChange={onChangeCollaboratorIds}
                        hasActiveFilters={hasActiveFilters}
                        onClearFilters={onClearFilters}
                    />
                </div>
                <div className="hidden md:flex md:items-center md:gap-3">
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
                            "control-surface py-2 px-3 text-small whitespace-nowrap cursor-pointer",
                            hasActiveFilters
                                ? "text-foreground hover:bg-card-background-hover"
                                : "text-foreground-third cursor-not-allowed opacity-60",
                        )}
                    >
                        Clear filters
                    </button>
                    <DensityMenu />
                </div>
            </div>
        </div>
    );
};

export default WorkspaceControls;
