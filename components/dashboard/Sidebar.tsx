"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { userInfo, Workspace } from "@/types/userTypes";
import WorkspaceModal from "./WorkspaceModal";

type SidebarItem = {
    text: string;
    icon: string;
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
};

const Sidebar = ({ friends = [], onCreated }: SidebarProps) => {
    const { user } = useUser();
    const pathname = usePathname();
    const role = useUserRole();
    const [createOpen, setCreateOpen] = useState(false);

    const sections: SidebarSection[] = [
        ...(role === "tutor"
            ? [
                  {
                      title: "Actions",
                      items: [
                          {
                              text: "Create Workspace",
                              icon: "/icons/folder-plus-svgrepo-com.svg",
                              status: true,
                              onClick: () => setCreateOpen(true),
                          },
                          {
                              text: "Add New Tutee",
                              icon: "/icons/users-svgrepo-com.svg",
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
                    text: "Workspaces",
                    icon: "/icons/notebook-svgrepo-com.svg",
                    status: true,
                    link: "/dashboard",
                    active: pathname === "/dashboard",
                },
                {
                    text: "Messages",
                    icon: "/icons/messages-1-svgrepo-com.svg",
                    status: false,
                },
                {
                    text: "Tutees",
                    icon: "/icons/graduation-hat-svgrepo-com.svg",
                    status: false,
                },
            ],
        },
    ];

    const renderItem = (item: SidebarItem, key: React.Key) => {
        const content = (
            <>
                <div className="relative w-5 h-5">
                    <Image src={item.icon} alt={item.text} fill />
                </div>
                <p className="text-small">{item.text}</p>
            </>
        );
        const className = cn(
            "flex gap-3 items-center rounded-sm",
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
                    {user?.imageUrl ? (
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-foreground-third">
                            <Image
                                src={user.imageUrl}
                                alt={`${user.firstName ?? "User"} icon`}
                                fill
                                sizes="40px"
                                className="object-cover"
                                unoptimized
                            />
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-foreground" />
                    )}
                    <div className="font-inter-bold flex flex-col leading-tight">
                        <p>
                            {user?.firstName ? `${user.firstName}'s` : "Your"}
                        </p>
                        <p>Chalkie Chalkie</p>
                    </div>
                </div>
                {sections.map((section, i) => (
                    <div key={i} className="flex flex-col gap-4">
                        <p className="text-caption text-foreground-third mx-2">
                            {section.title}
                        </p>
                        {section.items.map((item, j) => renderItem(item, j))}
                    </div>
                ))}
            </div>
            <div className="flex flex-col gap-4">
                <Link
                    href="/"
                    className="text-foreground-second font-inter-bold mx-2 flex gap-3 items-center rounded-sm cursor-pointer"
                >
                    <div className="relative w-5 h-5">
                        <Image
                            src="/icons/home-10-svgrepo-com.svg"
                            alt="Return Home"
                            fill
                        />
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
