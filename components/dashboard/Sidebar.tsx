"use client";

import React from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const Sidebar = () => {
    const { user } = useUser();
    const buttons = [
        {
            text: "Workspaces",
            icon: "icons/notebook-svgrepo-com.svg",
            status: true,
        },
        {
            text: "Messages",
            icon: "icons/messages-1-svgrepo-com.svg",
            status: false,
        },
    ];

    return (
        <div className="bg-card-background w-75 h-dvh p-4 flex flex-col gap-6 fixed">
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
                    <p>{user?.firstName ? `${user.firstName}'s` : "Your"}</p>
                    <p>Chalkie Chalkie</p>
                </div>
            </div>
            <div className="w-full h-px bg-foreground-third" />
            <div className="flex flex-col gap-4">
                {buttons.map((button, i) => (
                    <div
                        key={i}
                        className={cn(
                            "text-foreground-second flex gap-4 items-center p-2 rounded-sm",
                            button.status
                                ? "bg-background-second/25 cursor-pointer font-inter-bold"
                                : "opacity-25 cursor-not-allowed",
                        )}
                    >
                        <div className="relative w-6 h-6">
                            <Image src={button.icon} alt={button.text} fill />
                        </div>
                        <p className="text-sm">{button.text}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Sidebar;
