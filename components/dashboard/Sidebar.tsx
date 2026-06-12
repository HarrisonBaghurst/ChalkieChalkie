"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const Sidebar = () => {
    const { user } = useUser();
    const buttons = [
        [
            {
                text: "Workspaces",
                icon: "/icons/notebook-svgrepo-com.svg",
                status: true,
                link: null,
            },
            {
                text: "Messages",
                icon: "/icons/messages-1-svgrepo-com.svg",
                status: false,
                link: null,
            },
        ],
        [
            {
                text: "Return Home",
                icon: "/icons/home-10-svgrepo-com.svg",
                status: true,
                link: "/",
            },
        ],
    ];

    return (
        <div className="bg-card-background w-75 h-dvh p-4 flex flex-col justify-between fixed">
            <div className="flex flex-col gap-6">
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
                {buttons.map((section, i) => (
                    <div key={i} className="flex flex-col gap-6">
                        <div className="w-full h-px bg-foreground-third" />
                        <div className="flex flex-col gap-4">
                            {section.map((button, j) => {
                                const content = (
                                    <>
                                        <div className="relative w-5 h-5">
                                            <Image
                                                src={button.icon}
                                                alt={button.text}
                                                fill
                                            />
                                        </div>
                                        <p className="text-sm">{button.text}</p>
                                    </>
                                );
                                const className = cn(
                                    "text-foreground-second flex gap-3 items-center mx-2 rounded-sm",
                                    button.status
                                        ? "cursor-pointer font-inter-bold"
                                        : "opacity-25 cursor-not-allowed",
                                );
                                return button.link && button.status ? (
                                    <Link
                                        key={j}
                                        href={button.link}
                                        className={className}
                                    >
                                        {content}
                                    </Link>
                                ) : (
                                    <div key={j} className={className}>
                                        {content}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-foreground-third text-xs">
                © Chalkie Chalkie 2026
            </p>
        </div>
    );
};

export default Sidebar;
