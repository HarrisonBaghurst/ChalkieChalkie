"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { userInfo, UserRole, Workspace } from "@/types/userTypes";
import { LinkSummary } from "@/types/linkTypes";
import { Button } from "@/components/ui/button";
import WorkspaceModal from "../WorkspaceModal";
import LinkCodeDialog from "../connections/LinkCodeDialog";

type TabBarProps = {
    friends?: userInfo[];
    onCreated?: (workspace: Workspace, collaborators: userInfo[]) => void;
    onLinked?: (link: LinkSummary) => void;
    // Role resolved server-side by the caller, same contract as Sidebar's:
    // without it the client role reads "student" until Clerk hydrates, which
    // would flash the wrong tab label and the wrong action on the button.
    role?: UserRole;
};

// Mobile counterpart to Sidebar, below 2xl. Two tabs mirroring the Sidebar's
// Menu, plus one floating action button carrying the Actions section — which
// is otherwise unreachable on a phone, since the Sidebar is hidden.
//
// Unlike Navbar, this takes a server-resolved role, so the connections tab can
// be labelled "Students"/"Tutors" the way the Sidebar labels it rather than
// falling back to a role-neutral word.
const TabBar = ({ friends = [], onCreated, onLinked, role: serverRole }: TabBarProps) => {
    const pathname = usePathname();
    const { isLoaded } = useUser();
    const clientRole = useUserRole();
    const [createOpen, setCreateOpen] = useState(false);
    const [linkOpen, setLinkOpen] = useState(false);

    const role = serverRole ?? clientRole;
    const roleKnown = !!serverRole || isLoaded;
    const isTutor = roleKnown && role === "tutor";
    const isStudent = roleKnown && role === "student";
    const onConnections = pathname === "/dashboard/connections";

    const tabs = [
        {
            label: "Dashboard",
            href: "/dashboard",
            icon: "/icons/library.svg",
            iconDark: "/icons/library-dark.svg",
            // Admins hold no links, so the connections page has nothing for
            // them — Sidebar dims that row for the same reason.
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

    // One action, chosen by page and role. Each is gated on the callback that
    // lands its result in the caller's state — same reasoning as Sidebar,
    // except a floating button with nowhere to put its result is hidden rather
    // than shown disabled.
    const action = onConnections
        ? isTutor && onLinked
            ? { label: "Link a student", icon: "/icons/user-round-plus-dark.svg", run: () => setLinkOpen(true) }
            : isStudent && onLinked
              ? { label: "Link a tutor", icon: "/icons/user-round-plus-dark.svg", run: () => setLinkOpen(true) }
              : null
        : isTutor && onCreated
          ? { label: "Create workspace", icon: "/icons/file-plus-corner-dark.svg", run: () => setCreateOpen(true) }
          : isStudent && onLinked
            ? { label: "Add new tutor", icon: "/icons/user-round-plus-dark.svg", run: () => setLinkOpen(true) }
            : null;

    return (
        <div className="fixed inset-x-0 bottom-0 z-40">
            {action && (
                // Anchored to the bar's top edge, so it clears the safe-area
                // padding the bar already carries without repeating the maths.
                <div className="absolute bottom-full right-4 mb-4">
                    <Button
                        aria-label={action.label}
                        onClick={action.run}
                        className="size-14 rounded-full shadow-lg shadow-background/60"
                    >
                        <Image
                            src={action.icon}
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
                            {/* Filled indicator behind the icon only. The
                                Sidebar fills the whole active row, which at
                                half the screen's width would dominate the
                                bar. */}
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
            <WorkspaceModal
                open={createOpen}
                mode={{ kind: "create" }}
                friends={friends}
                onClose={() => setCreateOpen(false)}
                onSubmitted={onCreated ?? (() => {})}
                onDeleted={() => {}}
            />
            <LinkCodeDialog
                open={linkOpen}
                role={role === "student" ? "student" : "tutor"}
                onClose={() => setLinkOpen(false)}
                onLinked={onLinked ?? (() => {})}
            />
        </div>
    );
};

export default TabBar;
