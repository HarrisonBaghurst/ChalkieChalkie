"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { resolveDashboardAction } from "@/lib/dashboardActions";
import { userInfo, UserRole, Workspace } from "@/types/userTypes";
import { LinkSummary } from "@/types/linkTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Skeleton from "@/components/ui/Skeleton";
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
                    <div className="relative w-5 h-5">
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
                    <p className="text-small">{item.text}</p>
                </div>
                {item.badge && (
                    <Badge variant="outline" className="ml-auto">
                        {item.badge}
                    </Badge>
                )}
            </>
        );
        const className = cn(
            navItemClass,
            item.active
                ? "bg-foreground text-background! font-inter-bold cursor-pointer"
                : item.status
                  ? navItemEnabledClass
                  : "bg-accent text-foreground-second cursor-not-allowed",
        );

        if (item.link && item.status) {
            return (
                <Link key={key} href={item.link} className={className}>
                    {content}
                </Link>
            );
        }
        return (
            <div key={key} className={className}>
                {content}
            </div>
        );
    };

    const actionControl = !roleKnown ? (
        <Skeleton className="h-9 radius-control" />
    ) : action && actionReady ? (
        <Button
            variant="outline"
            onClick={() =>
                action.id === "create-workspace"
                    ? setCreateOpen(true)
                    : setLinkOpen(true)
            }
            className="w-full justify-start gap-3 px-2 py-2 text-small"
        >
            <Image src={action.icon} alt="" width={20} height={20} />
            {action.label}
        </Button>
    ) : null;

    return (
        <div className="bg-card-background w-75 h-dvh p-4 flex flex-col justify-between fixed">
            <div className="flex flex-col gap-8">
                <div className="flex gap-4 items-center">
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
                    <div className="font-inter-bold flex flex-col leading-tight">
                        <p className="text-caption text-foreground-second">
                            {user?.firstName ? `${user.firstName}'s` : "Your"}
                        </p>
                        <p>Chalkie Chalkie</p>
                    </div>
                </div>
                <div className="flex flex-col gap-4">
                    <p className="text-caption text-foreground-third mx-2">
                        Menu
                    </p>
                    <div className="flex flex-col gap-2">
                        {menu.map((item, i) => renderItem(item, i))}
                    </div>
                </div>
                {actionControl && (
                    <div className="flex flex-col gap-4">
                        <p className="text-caption text-foreground-third mx-2">
                            Actions
                        </p>
                        {actionControl}
                    </div>
                )}
            </div>
            <div className="flex flex-col gap-8">
                <Link
                    href="/"
                    className={cn(navItemClass, navItemEnabledClass)}
                >
                    <div className="relative w-5 h-5">
                        <Image src="/icons/house.svg" alt="Return Home" fill />
                    </div>
                    <p className="text-small">Return Home</p>
                </Link>
                <p className="text-foreground-third text-caption">
                    © Chalkie Chalkie 2026
                </p>
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
