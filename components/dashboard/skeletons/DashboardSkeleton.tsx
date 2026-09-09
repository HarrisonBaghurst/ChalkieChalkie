import Image from "next/image";
import { Rows3Icon, SlidersHorizontalIcon } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";
import { fieldClasses } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { WORKSPACE_TABLE_COLUMNS } from "@/lib/dashboardTableColumns";
import { useSidebarCollapse } from "../sidebarCollapse";
import { nextCardWidth } from "../Next";
import DataTable from "../DataTable";
import WorkspaceTableRowSkeleton from "./WorkspaceTableRowSkeleton";
import { MobileListSkeleton } from "./MobileRowSkeleton";

const PLACEHOLDER_ROWS = 5;

const NextSkeleton = () => {
    const { collapsed } = useSidebarCollapse();

    return (
        <div
            className={cn(
                "relative h-fit bg-card-background border-2 p-5 radius-surface flex flex-col gap-6 gradient-border",
                nextCardWidth(collapsed),
            )}
        >
            <div className="absolute top-5 right-5 hidden md:block">
                <Skeleton className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-6 md:pr-8">
                <p className="text-caption font-inter-regular gradient-text">
                    Coming up next
                </p>
                <div className="grid grid-cols-[auto_1fr] items-start gap-x-5 gap-y-6">
                    <Skeleton className="w-12 h-12 radius-tag" />
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-7 w-48 max-w-full" />
                        <Skeleton className="h-4 w-32 max-w-full" />
                    </div>
                    <div className="col-span-2 flex flex-col gap-1 md:col-span-1 md:col-start-2">
                        <p className="text-caption text-foreground-third">
                            Description
                        </p>
                        <Skeleton className="h-4 w-full" />
                    </div>
                    <div className="col-span-2 flex flex-wrap gap-2 md:col-span-1 md:col-start-2">
                        <Skeleton className="h-6 w-20 radius-tag" />
                        <Skeleton className="h-6 w-28 radius-tag" />
                    </div>
                </div>
            </div>
            <p className="text-caption text-foreground-third md:hidden">
                Open Chalkie Chalkie on a computer to join this workspace.
            </p>
        </div>
    );
};

const ControlsSkeleton = () => {
    const tabs = ["Upcoming", "Previous", "All"];

    return (
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-4">
            <div className="flex w-full items-center gap-1 control-surface p-1 md:w-fit">
                {tabs.map((label, i) => (
                    <div
                        key={label}
                        className={`flex flex-1 items-center justify-center gap-2 radius-tag px-3 py-1.5 text-small ${
                            i === 0
                                ? "bg-foreground-third/30 text-foreground"
                                : "text-foreground-third"
                        }`}
                    >
                        <span className="text-small">{label}</span>
                        <Skeleton className="h-3 w-3" />
                    </div>
                ))}
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div
                    className={cn(
                        fieldClasses(false, "control"),
                        "pointer-events-none text-foreground-third md:w-56",
                    )}
                >
                    Search sessions...
                </div>
                <div className="control-surface flex w-full items-center justify-between gap-2 py-2 px-3 text-small text-foreground-second md:hidden">
                    <span className="flex items-center gap-2">
                        <SlidersHorizontalIcon className="size-4 text-foreground-third" />
                        Filters
                    </span>
                    <span className="text-caption text-foreground-third">
                        None
                    </span>
                </div>
                <div className="hidden md:flex md:items-center md:gap-3">
                    <div className="control-surface py-2 px-3 flex items-center justify-between text-small gap-2 text-foreground-third">
                        <span>Members</span>
                        <Image
                            src="/icons/chevron-down.svg"
                            alt=""
                            width={12}
                            height={12}
                            className="opacity-50 shrink-0"
                        />
                    </div>
                    <div className="control-surface text-foreground-third py-2 px-3 text-small whitespace-nowrap opacity-60">
                        Clear filters
                    </div>
                    <div className="control-surface px-2.5 py-2 text-small text-foreground-third">
                        <Rows3Icon className="size-4 align-middle" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const TableSkeleton = () => {
    return (
        <DataTable
            columns={WORKSPACE_TABLE_COLUMNS}
            toolbar={<ControlsSkeleton />}
        >
            {Array.from({ length: PLACEHOLDER_ROWS }).map((_, i) => (
                <WorkspaceTableRowSkeleton key={i} />
            ))}
        </DataTable>
    );
};

const DashboardSkeleton = () => {
    return (
        <>
            <div className="flex flex-col gap-1">
                <p className="text-heading font-inter-bold">Your Dashboard</p>
                <p className="text-foreground-second">
                    View and update your workspaces
                </p>
            </div>

            <NextSkeleton />

            <div className="w-full min-w-0 h-fit">
                <div className="flex flex-col gap-4 md:hidden">
                    <ControlsSkeleton />
                    <MobileListSkeleton rows={PLACEHOLDER_ROWS} showStatus />
                </div>
                <div className="hidden md:block">
                    <TableSkeleton />
                </div>
            </div>
        </>
    );
};

export default DashboardSkeleton;
