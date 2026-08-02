import React from "react";
import Image from "next/image";
import { SlidersHorizontalIcon } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";
import { WORKSPACE_TABLE_COLUMNS } from "@/lib/dashboardTableColumns";
import WorkspaceTableRowSkeleton from "./WorkspaceTableRowSkeleton";
import { MobileListSkeleton } from "./MobileRowSkeleton";

// Placeholder column shown while the dashboard's workspaces/users fetch is in
// flight. Mirrors the real tree rendered by DashboardClient: page heading, the
// Next card, then WorkspaceLists' control row and workspace table. Static
// chrome (headings, tab labels, control labels, table column headers) is
// rendered for real and only data-dependent parts shimmer, so nothing moves
// when the data lands. Slots into DashboardShell's content column.
//
// Every breakpoint swap here mirrors one in the real components — change the
// seam there and it has to change here too, or the placeholder stops matching
// what replaces it.

const PLACEHOLDER_ROWS = 5;

// Mirrors Next.tsx's populated card: gradient border, open-in-new icon, the
// counterparty avatar and the time/title, description and info-tag column.
// Below 2xl the avatar stacks above the detail column and the card carries the
// desktop-only note instead of the open-in-new icon, matching the real card.
const NextSkeleton = () => {
    return (
        <div className="relative w-full 2xl:w-1/3 h-fit bg-card-background border-2 p-5 radius-surface flex flex-col gap-6 gradient-border">
            <div className="absolute top-5 right-5 hidden 2xl:block">
                <Skeleton className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-6 2xl:pr-8">
                <p className="text-caption font-inter-regular gradient-text">
                    COMING UP NEXT
                </p>
                {/* Same grid as NextContent — avatar beside the time only on a
                    phone, sharing its column with every block from 2xl. */}
                <div className="grid grid-cols-[auto_1fr] items-start gap-x-5 gap-y-6">
                    <Skeleton className="w-12 h-12 radius-tag" />
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-7 w-48 max-w-full" />
                        <Skeleton className="h-4 w-32 max-w-full" />
                    </div>
                    <div className="col-span-2 flex flex-col gap-1 2xl:col-span-1 2xl:col-start-2">
                        <p className="text-caption text-foreground-third">
                            Description
                        </p>
                        <Skeleton className="h-4 w-full" />
                    </div>
                    <div className="col-span-2 flex flex-wrap gap-2 2xl:col-span-1 2xl:col-start-2">
                        <Skeleton className="h-6 w-20 radius-tag" />
                        <Skeleton className="h-6 w-28 radius-tag" />
                    </div>
                </div>
            </div>
            <p className="text-caption text-foreground-third 2xl:hidden">
                Open Chalkie Chalkie on a computer to join this workspace.
            </p>
        </div>
    );
};

// Mirrors WorkspaceLists' control row: one column on a phone (tabs, search,
// filters sheet trigger), the original single row from 2xl. The controls are
// inert copies of the real chrome — only the per-tab counts, which depend on
// the fetch, are shimmered.
const ControlsSkeleton = () => {
    const tabs = ["Upcoming", "Previous", "All"];

    return (
        <div className="flex flex-col gap-3 2xl:flex-row 2xl:flex-wrap 2xl:items-center 2xl:justify-between 2xl:gap-4">
            <div className="flex w-full items-center gap-1 control-surface p-1 2xl:w-fit">
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
            <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center">
                <div className="w-full control-surface bg-card-background-hover py-2 px-3 text-small text-foreground-third 2xl:w-56">
                    Search sessions...
                </div>
                <div className="control-surface flex w-full items-center justify-between gap-2 py-2 px-3 text-small text-foreground-second 2xl:hidden">
                    <span className="flex items-center gap-2">
                        <SlidersHorizontalIcon className="size-4 text-foreground-third" />
                        Filters
                    </span>
                    <span className="text-caption text-foreground-third">
                        None
                    </span>
                </div>
                <div className="hidden 2xl:flex 2xl:items-center 2xl:gap-3">
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
                </div>
            </div>
        </div>
    );
};

// Mirrors WorkspaceTable: same container, same border-separate corner handling
// and the same column headers, with placeholder rows in the body.
const TableSkeleton = () => {
    return (
        <div className="w-full radius-surface border border-foreground-third/15 bg-card-background">
            <table className="w-full table-fixed border-separate border-spacing-0 [&_tbody_tr:last-child>td]:border-b-0 [&_tbody_tr:last-child>td:first-child]:rounded-bl-[13px] [&_tbody_tr:last-child>td:last-child]:rounded-br-[13px]">
                <thead>
                    <tr>
                        {WORKSPACE_TABLE_COLUMNS.map((col, i) => (
                            <th
                                key={col.key}
                                className={`${col.width} border-b border-foreground-third/15 bg-background-second px-3 py-3 text-left text-caption font-inter-regular text-foreground-third ${
                                    i === 0 ? "rounded-tl-[13px]" : ""
                                } ${
                                    i === WORKSPACE_TABLE_COLUMNS.length - 1
                                        ? "rounded-tr-[13px]"
                                        : ""
                                }`}
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: PLACEHOLDER_ROWS }).map((_, i) => (
                        <WorkspaceTableRowSkeleton key={i} />
                    ))}
                </tbody>
            </table>
        </div>
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

            <div className="w-full flex flex-col gap-4 h-fit">
                <ControlsSkeleton />
                <div className="2xl:hidden">
                    <MobileListSkeleton rows={PLACEHOLDER_ROWS} showStatus />
                </div>
                <div className="hidden 2xl:block">
                    <TableSkeleton />
                </div>
            </div>
        </>
    );
};

export default DashboardSkeleton;
