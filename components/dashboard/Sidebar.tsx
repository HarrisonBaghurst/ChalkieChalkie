"use client";

import React from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";

const Sidebar = () => {
    const { user } = useUser();
    const buttons = ["Workspaces", "Messages"];

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
                {buttons.map((text, i) => (
                    <div
                        key={i}
                        className="text-foreground-second flex gap-3 items-center"
                    >
                        <div className="w-6 h-6 rounded-full bg-foreground-third" />
                        <p className="text-sm">{text}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Sidebar;
