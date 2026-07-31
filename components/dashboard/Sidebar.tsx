"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { userInfo, UserRole, Workspace } from "@/types/userTypes";
import Skeleton from "@/components/ui/Skeleton";
import WorkspaceModal from "./WorkspaceModal";

type SidebarItem = {
    text: string;
    icon: string;
    iconDark?: string;
    status: boolean;
    link?: string | null;
    onClick?: () => void;
    active?: boolean;
};

type SidebarSection = {
    title: string;
    items: SidebarItem[];
};

type SidebarProps = {
    friends?: userInfo[];
    onCreated?: (workspace: Workspace, collaborators: userInfo[]) => void;
    // Role resolved server-side by the caller. Lets the role-gated Actions
    // section render correctly on first paint; without it we fall back to the
    // client role, which reads "student" until Clerk hydrates.
    role?: UserRole;
};

const Sidebar = ({
    friends = [],
    onCreated,
    role: serverRole,
}: SidebarProps) => {
    const { user, isLoaded } = useUser();
    const pathname = usePathname();
    const clientRole = useUserRole();
    const [createOpen, setCreateOpen] = useState(false);

    const role = serverRole ?? clientRole;
    // Absent a server-resolved role we can't tell whether the Actions section
    // belongs to this user until Clerk hydrates, so its space is reserved.
    const roleKnown = !!serverRole || isLoaded;
    // Creating needs a callback to land the new workspace in the page's state;
    // without one the new workspace would vanish until reload, so the action
    // renders in the disabled style instead.
    const canCreate = !!onCreated;

    const sections: SidebarSection[] = [
        ...(roleKnown && role === "tutor"
            ? [
                  {
                      title: "Actions",
                      items: [
                          {
                              text: "Create Workspace",
                              icon: "/icons/file-plus-corner.svg",
                              iconDark: "/icons/file-plus-corner-dark.svg",
                              status: canCreate,
                              onClick: () => setCreateOpen(true),
                          },
                          {
                              text: "Add New Tutee",
                              icon: "/icons/user-round-plus.svg",
                              iconDark: "/icons/user-round-plus-dark.svg",
                              status: false,
                          },
                      ],
                  },
              ]
            : []),
        {
            title: "Menu",
            items: [
                {
                    text: "Dashboard",
                    icon: "/icons/library.svg",
                    iconDark: "/icons/library-dark.svg",
                    status: true,
                    link: "/dashboard",
                    active: pathname === "/dashboard",
                },
                {
                    text: "Messages",
                    icon: "/icons/message-square-text.svg",
                    iconDark: "/icons/message-square-text-dark.svg",
                    status: false,
                },
                {
                    text: "Tutees",
                    icon: "/icons/graduation-cap.svg",
                    iconDark: "/icons/graduation-cap-dark.svg",
                    status: false,
                },
            ],
        },
    ];

    const renderItem = (item: SidebarItem, key: React.Key) => {
        const content = (
            <>
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
            </>
        );
        const className = cn(
            "flex gap-3 items-center radius-tag",
            item.active
                ? "bg-foreground text-background! font-inter-bold px-2 py-2 cursor-pointer"
                : item.status
                  ? "text-foreground-second font-inter-bold mx-2 cursor-pointer"
                  : "text-foreground-second opacity-25 cursor-not-allowed mx-2",
        );

        if (item.link && item.status) {
            return (
                <Link key={key} href={item.link} className={className}>
                    {content}
                </Link>
            );
        }
        if (item.onClick && item.status) {
            return (
                <div key={key} className={className} onClick={item.onClick}>
                    {content}
                </div>
            );
        }
        return (
            <div key={key} className={className}>
                {content}
            </div>
        );
    };

    return (
        <div className="bg-card-background w-75 h-dvh p-4 flex flex-col justify-between fixed">
            <div className="flex flex-col gap-8">
                <div className="flex gap-4 items-center">
                    {/* Same control as the Navbar's: clicking the avatar opens
                        Clerk's account menu. Held by a skeleton until Clerk
                        hydrates, since UserButton renders nothing until then. */}
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
                        {/* "Your" covers both the pre-hydration gap and users
                            without a first name, so this line never shimmers. */}
                        <p className="text-caption text-foreground-second">
                            {user?.firstName ? `${user.firstName}'s` : "Your"}
                        </p>
                        <p>Chalkie Chalkie</p>
                    </div>
                </div>
                {/* Placeholder for the tutor-only Actions section while the role
                    is still unknown, so the Menu below doesn't jump once it
                    resolves. Mirrors two renderItem rows. */}
                {!roleKnown && (
                    <div className="flex flex-col gap-4">
                        <p className="text-caption text-foreground-third mx-2">
                            Actions
                        </p>
                        {["w-32", "w-28"].map((width) => (
                            <div
                                key={width}
                                className="flex gap-3 items-center mx-2"
                            >
                                <Skeleton className="w-5 h-5 radius-tag" />
                                <Skeleton className={`h-4 ${width}`} />
                            </div>
                        ))}
                    </div>
                )}
                {sections.map((section, i) => (
                    <div key={i} className="flex flex-col gap-4">
                        <p className="text-caption text-foreground-third mx-2">
                            {section.title}
                        </p>
                        {section.items.map((item, j) => renderItem(item, j))}
                    </div>
                ))}
            </div>
            <div className="flex flex-col gap-8">
                <Link
                    href="/"
                    className="text-foreground-second font-inter-bold mx-2 flex gap-3 items-center radius-tag cursor-pointer"
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
            <WorkspaceModal
                open={createOpen}
                mode={{ kind: "create" }}
                friends={friends}
                onClose={() => setCreateOpen(false)}
                onSubmitted={onCreated ?? (() => {})}
                onDeleted={() => {}}
            />
        </div>
    );
};

export default Sidebar;
