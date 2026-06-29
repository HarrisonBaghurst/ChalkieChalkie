"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { userInfo, Workspace } from "@/types/userTypes";
import { formatSessionTime } from "@/lib/textUtils";
import { pickCounterparty } from "@/lib/dashboardCounterparty";

type NextProps = {
    workspace: Workspace | null;
    usersMap: Record<string, userInfo>;
    viewerIsHost: boolean;
};

const Next = ({ workspace, usersMap, viewerIsHost }: NextProps) => {
    const counterparty = workspace
        ? pickCounterparty(workspace, usersMap, viewerIsHost)
        : null;

    const router = useRouter();
    const [hovered, setHovered] = useState(false);
    const [cursor, setCursor] = useState({ x: 0, y: 0 });

    if (!workspace) {
        return (
            <div className="w-full 2xl:w-1/3 h-50 bg-card-background border-2 p-4 rounded-xl flex flex-col gap-3 gradient-border">
                <p className="text-caption text-foreground-second font-inter-regular">
                    Coming up next
                </p>
                <p className="text-subheading">No upcoming sessions</p>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={() => router.push(`/board/${workspace.id}`)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setCursor({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                });
            }}
            className="group relative w-full 2xl:w-1/3 h-55 bg-card-background border-2 p-4 rounded-xl flex flex-col gap-4 text-left cursor-pointer gradient-border"
        >
            <div
                className={`pointer-events-none absolute z-10 bg-foreground text-background text-caption font-inter-regular px-2 py-1 rounded-sm whitespace-nowrap shadow-md transition-opacity duration-150 ${
                    hovered ? "opacity-100" : "opacity-0"
                }`}
                style={{ left: cursor.x + 14, top: cursor.y + 14 }}
            >
                Join workspace
            </div>

            <div className="absolute top-4 right-4">
                <Image
                    src="/icons/external-link.svg"
                    alt="Open workspace"
                    width={20}
                    height={20}
                    className="opacity-50 group-hover:opacity-100 transition-opacity"
                />
            </div>
            <div className="flex flex-col gap-5 pr-8">
                <p className="text-caption text-foreground-third font-inter-regular">
                    COMING UP NEXT
                </p>
                <div className="flex items-center gap-4">
                    {counterparty?.imageUrl ? (
                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-foreground-third">
                            <Image
                                src={counterparty.imageUrl}
                                alt={`${counterparty.firstName} ${counterparty.lastName}`}
                                fill
                                sizes="40px"
                                className="object-cover"
                                unoptimized
                            />
                        </div>
                    ) : (
                        <div className="w-8 h-8 bg-foreground-third rounded-full" />
                    )}
                    <div>
                        <p className="text-heading">
                            {formatSessionTime(workspace.startTime)}
                        </p>
                        <p className="text-body font-inter-bold">
                            {workspace.title}
                        </p>
                    </div>
                </div>
            </div>

            {workspace.description && (
                <p className="text-small text-foreground-second leading-5 max-h-15 overflow-y-auto">
                    {workspace.description}
                </p>
            )}
        </button>
    );
};

export default Next;
