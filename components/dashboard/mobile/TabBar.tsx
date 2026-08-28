"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { resolveDashboardAction } from "@/lib/dashboardActions";
import { userInfo, UserRole, Workspace } from "@/types/userTypes";
import { LinkSummary } from "@/types/linkTypes";
import { Button } from "@/components/ui/button";
import WorkspaceModal from "../WorkspaceModal";
import LinkCodeDialog from "../connections/LinkCodeDialog";

type TabBarProps = {
    friends?: userInfo[];
    onCreated?: (workspace: Workspace, collaborators: userInfo[]) => void;
    onLinked?: (link: LinkSummary) => void;
    role?: UserRole;
};

// The floating action button carries the Sidebar's Actions, which are
// otherwise unreachable below lg.
const TabBar = ({
    friends = [],
    onCreated,
    onLinked,
    role: serverRole,
}: TabBarProps) => {
    const pathname = usePathname();
    const { isLoaded } = useUser();
    const clientRole = useUserRole();
    const [createOpen, setCreateOpen] = useState(false);
    const [linkOpen, setLinkOpen] = useState(false);

    const role = serverRole ?? clientRole;
    const roleKnown = !!serverRole || isLoaded;
    const isTutor = roleKnown && role === "tutor";
    const isStudent = roleKnown && role === "student";

    const tabs = [
        {
            label: "Dashboard",
            href: "/dashboard",
            icon: "/icons/library.svg",
            iconDark: "/icons/library-dark.svg",
            enabled: true,
        },
        {
            label: role === "student" ? "Tutors" : "Students",
            href: "/dashboard/connections",
            icon: "/icons/graduation-cap.svg",
            iconDark: "/icons/graduation-cap-dark.svg",
            enabled: isTutor || isStudent,
        },
    ];

    const action = roleKnown ? resolveDashboardAction(pathname, role) : null;
    const actionReady =
        action?.id === "create-workspace" ? !!onCreated : !!onLinked;

    return (
        <div className="fixed inset-x-0 bottom-0 z-40">
            {action && actionReady && (
                <div className="absolute bottom-full right-4 mb-4">
                    <Button
                        aria-label={action.label}
                        onClick={() =>
                            action.id === "create-workspace"
                                ? setCreateOpen(true)
                                : setLinkOpen(true)
                        }
                        className="size-14 rounded-full shadow-lg shadow-background/60"
                    >
                        <Image
                            src={action.iconDark}
                            alt=""
                            width={22}
                            height={22}
                        />
                    </Button>
                </div>
            )}
            <nav className="flex items-stretch border-t border-border bg-card-background px-4 pt-2 pb-safe [--safe-pb:0.5rem]">
                {tabs.map((tab) => {
                    const active = pathname === tab.href;
                    const content = (
                        <>
                            <span
                                className={cn(
                                    "flex h-8 w-16 items-center justify-center radius-tag transition-colors",
                                    active && "bg-foreground",
                                )}
                            >
                                <Image
                                    src={active ? tab.iconDark : tab.icon}
                                    alt=""
                                    width={20}
                                    height={20}
                                />
                            </span>
                            <span
                                className={cn(
                                    "text-caption",
                                    active
                                        ? "text-foreground font-inter-bold"
                                        : "text-foreground-second",
                                )}
                            >
                                {tab.label}
                            </span>
                        </>
                    );

                    const className =
                        "flex flex-1 flex-col items-center gap-1 py-1";

                    if (!tab.enabled) {
                        return (
                            <div
                                key={tab.href}
                                className={cn(
                                    className,
                                    "opacity-25 cursor-not-allowed",
                                )}
                            >
                                {content}
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            aria-current={active ? "page" : undefined}
                            className={className}
                        >
                            {content}
                        </Link>
                    );
                })}
            </nav>
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

export default TabBar;
