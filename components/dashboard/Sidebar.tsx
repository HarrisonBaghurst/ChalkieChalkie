"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { resolveDashboardAction } from "@/lib/dashboardActions";
import {
    byCollapseState,
    CollapseState,
    useSidebarCollapse,
} from "./sidebarCollapse";
import { userInfo, UserRole, Workspace } from "@/types/userTypes";
import { LinkSummary } from "@/types/linkTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Skeleton from "@/components/ui/Skeleton";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import WorkspaceModal from "./WorkspaceModal";
import LinkCodeDialog from "./connections/LinkCodeDialog";

type SidebarItem = {
    text: string;
    icon: string;
    iconDark?: string;
    status: boolean;
    badge?: string;
    link?: string | null;
    active?: boolean;
};

const navItemClass =
    "flex gap-3 items-center radius-tag border border-transparent px-2 py-2 transition-colors";

const navItemEnabledClass =
    "bg-accent text-foreground-second font-inter-bold cursor-pointer hover:bg-foreground-third/35";

const railRowClass = (collapsed: CollapseState) =>
    byCollapseState(
        collapsed,
        "w-9 px-0 justify-center",
        "",
        "w-9 px-0 justify-center lg:w-auto lg:px-2 lg:justify-start",
    );

const railIdentityClass = (collapsed: CollapseState) =>
    byCollapseState(
        collapsed,
        "w-9 justify-center",
        "",
        "w-9 justify-center lg:w-auto lg:justify-start",
    );

const railButtonClass = (collapsed: CollapseState) =>
    byCollapseState(
        collapsed,
        "w-9 px-0 justify-center",
        "w-full px-2 justify-start",
        "w-9 px-0 justify-center lg:w-full lg:px-2 lg:justify-start",
    );

const panelOnlyClass = (collapsed: CollapseState) =>
    byCollapseState(collapsed, "hidden", "block", "hidden lg:block");

const railTooltipClass = (collapsed: CollapseState) =>
    byCollapseState(collapsed, "", "hidden", "lg:hidden");

const RailTooltip = ({
    label,
    collapsed,
    children,
}: {
    label: string;
    collapsed: CollapseState;
    children: React.ReactElement;
}) => (
    <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="right" className={railTooltipClass(collapsed)}>
            {label}
        </TooltipContent>
    </Tooltip>
);

const SectionHeading = ({
    label,
    collapsed,
}: {
    label: string;
    collapsed: CollapseState;
}) => (
    <div
        className={cn("flex gap-3 items-center px-2", railRowClass(collapsed))}
    >
        <p className="text-caption text-foreground-third text-nowrap">
            {label}
        </p>
        <div
            className={cn(
                "h-px grow bg-foreground-third/50",
                panelOnlyClass(collapsed),
            )}
        />
    </div>
);

type SidebarProps = {
    friends?: userInfo[];
    onCreated?: (workspace: Workspace, collaborators: userInfo[]) => void;
    onLinked?: (link: LinkSummary) => void;
    role?: UserRole;
};

const Sidebar = ({
    friends = [],
    onCreated,
    onLinked,
    role: serverRole,
}: SidebarProps) => {
    const { user, isLoaded } = useUser();
    const pathname = usePathname();
    const clientRole = useUserRole();
    const { collapsed, toggle } = useSidebarCollapse();
    const [createOpen, setCreateOpen] = useState(false);
    const [linkOpen, setLinkOpen] = useState(false);

    const role = serverRole ?? clientRole;
    const roleKnown = !!serverRole || isLoaded;

    const action = roleKnown ? resolveDashboardAction(pathname, role) : null;
    const actionReady =
        action?.id === "create-workspace" ? !!onCreated : !!onLinked;

    const connectionsLabel = role === "student" ? "Tutors" : "Students";

    const menu: SidebarItem[] = [
        {
            text: "Dashboard",
            icon: "/icons/library.svg",
            iconDark: "/icons/library-dark.svg",
            status: true,
            link: "/dashboard",
            active: pathname === "/dashboard",
        },
        {
            text: connectionsLabel,
            icon: "/icons/graduation-cap.svg",
            iconDark: "/icons/graduation-cap-dark.svg",
            status: roleKnown && role !== "admin",
            link: "/dashboard/connections",
            active: pathname === "/dashboard/connections",
        },
        {
            text: "Messages",
            icon: "/icons/message-square-text.svg",
            iconDark: "/icons/message-square-text-dark.svg",
            status: false,
            badge: "Soon",
        },
    ];

    const renderItem = (item: SidebarItem, key: React.Key) => {
        const content = (
            <>
                <div
                    className={cn(
                        "flex gap-3 items-center",
                        !item.status && !item.active && "opacity-25",
                    )}
                >
                    <div className="relative w-5 h-5 shrink-0">
                        <Image
                            src={
                                item.active && item.iconDark
                                    ? item.iconDark
                                    : item.icon
                            }
                            alt={item.text}
                            fill
                        />
                    </div>
                    <p
                        className={cn(
                            "text-small text-nowrap",
                            panelOnlyClass(collapsed),
                        )}
                    >
                        {item.text}
                    </p>
                </div>
                {item.badge && (
                    <Badge
                        variant="outline"
                        className={cn(
                            "ml-auto",
                            byCollapseState(
                                collapsed,
                                "hidden",
                                "inline-flex",
                                "hidden lg:inline-flex",
                            ),
                        )}
                    >
                        {item.badge}
                    </Badge>
                )}
            </>
        );
        const className = cn(
            navItemClass,
            railRowClass(collapsed),
            item.active
                ? "bg-foreground text-background! font-inter-bold cursor-pointer"
                : item.status
                  ? navItemEnabledClass
                  : "bg-accent text-foreground-second cursor-not-allowed",
        );

        const row =
            item.link && item.status ? (
                <Link href={item.link} className={className}>
                    {content}
                </Link>
            ) : (
                <div className={className}>{content}</div>
            );

        return (
            <RailTooltip
                key={key}
                collapsed={collapsed}
                label={item.badge ? `${item.text} · ${item.badge}` : item.text}
            >
                {row}
            </RailTooltip>
        );
    };

    const actionControl = !roleKnown ? (
        <Skeleton className="h-9 radius-control" />
    ) : action && actionReady ? (
        <RailTooltip collapsed={collapsed} label={action.label}>
            <Button
                variant="outline"
                aria-label={action.label}
                onClick={() =>
                    action.id === "create-workspace"
                        ? setCreateOpen(true)
                        : setLinkOpen(true)
                }
                className={cn(
                    "gap-3 py-2 text-small",
                    railButtonClass(collapsed),
                )}
            >
                <Image src={action.icon} alt="" width={20} height={20} />
                <span className={cn("text-nowrap", panelOnlyClass(collapsed))}>
                    {action.label}
                </span>
            </Button>
        </RailTooltip>
    ) : null;

    return (
        <div
            className={cn(
                "bg-card-background h-dvh p-4 flex flex-col justify-between fixed overflow-hidden transition-[width]",
                byCollapseState(collapsed, "w-17", "w-75", "w-17 lg:w-75"),
            )}
        >
            <div className="flex flex-col gap-8">
                <div
                    className={cn(
                        "flex gap-4 items-center",
                        railIdentityClass(collapsed),
                    )}
                >
                    {isLoaded ? (
                        <UserButton
                            appearance={{
                                elements: {
                                    avatarBox: "!w-10 !h-10 !rounded-sm",
                                },
                            }}
                        />
                    ) : (
                        <Skeleton className="w-10 h-10 rounded-sm" />
                    )}
                    <div
                        className={cn(
                            "font-inter-bold flex-col leading-tight",
                            byCollapseState(
                                collapsed,
                                "hidden",
                                "flex",
                                "hidden lg:flex",
                            ),
                        )}
                    >
                        <p className="text-caption text-foreground-second text-nowrap">
                            {user?.firstName ? `${user.firstName}'s` : "Your"}
                        </p>
                        <p className="text-nowrap">Chalkie Chalkie</p>
                    </div>
                </div>
                <div className="flex flex-col gap-4">
                    <SectionHeading label="Menu" collapsed={collapsed} />
                    <div className="flex flex-col gap-2">
                        {menu.map((item, i) => renderItem(item, i))}
                    </div>
                </div>
                {actionControl && (
                    <div className="flex flex-col gap-4">
                        <SectionHeading label="Actions" collapsed={collapsed} />
                        {actionControl}
                    </div>
                )}
            </div>
            <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-2">
                    <RailTooltip collapsed={collapsed} label="Expand">
                        <button
                            type="button"
                            onClick={toggle}
                            aria-label="Toggle sidebar"
                            className={cn(
                                navItemClass,
                                navItemEnabledClass,
                                railRowClass(collapsed),
                            )}
                        >
                            <div
                                className={cn(
                                    "relative w-5 h-5 shrink-0 transition-transform",
                                    byCollapseState(
                                        collapsed,
                                        "-rotate-90",
                                        "rotate-90",
                                        "-rotate-90 lg:rotate-90",
                                    ),
                                )}
                            >
                                <Image
                                    src="/icons/chevron-down.svg"
                                    alt=""
                                    fill
                                />
                            </div>
                            <p
                                className={cn(
                                    "text-small text-nowrap",
                                    panelOnlyClass(collapsed),
                                )}
                            >
                                Collapse
                            </p>
                        </button>
                    </RailTooltip>
                    <RailTooltip collapsed={collapsed} label="Return Home">
                        <Link
                            href="/"
                            className={cn(
                                navItemClass,
                                navItemEnabledClass,
                                railRowClass(collapsed),
                            )}
                        >
                            <div className="relative w-5 h-5 shrink-0">
                                <Image
                                    src="/icons/house.svg"
                                    alt="Return Home"
                                    fill
                                />
                            </div>
                            <p
                                className={cn(
                                    "text-small text-nowrap",
                                    panelOnlyClass(collapsed),
                                )}
                            >
                                Return home
                            </p>
                        </Link>
                    </RailTooltip>
                </div>
                <div
                    className={cn(
                        "w-full flex",
                        byCollapseState(
                            collapsed,
                            "justify-end",
                            "justify-between",
                            "justify-end lg:justify-between",
                        ),
                    )}
                >
                    <p
                        className={cn(
                            "text-foreground-third text-caption text-nowrap",
                            panelOnlyClass(collapsed),
                        )}
                    >
                        © Chalkie Chalkie 2026
                    </p>
                    <p className="text-foreground-third text-caption">
                        v{process.env.NEXT_PUBLIC_VERSION}
                    </p>
                </div>
            </div>
            {action?.id === "create-workspace" && (
                <WorkspaceModal
                    open={createOpen}
                    mode={{ kind: "create" }}
                    friends={friends}
                    onClose={() => setCreateOpen(false)}
                    onSubmitted={onCreated ?? (() => {})}
                    onDeleted={() => {}}
                />
            )}
            {action?.id === "add-link" && (
                <LinkCodeDialog
                    open={linkOpen}
                    role={role === "student" ? "student" : "tutor"}
                    onClose={() => setLinkOpen(false)}
                    onLinked={onLinked ?? (() => {})}
                />
            )}
        </div>
    );
};

export default Sidebar;
