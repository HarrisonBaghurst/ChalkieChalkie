"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { userInfo, Workspace } from "@/types/userTypes";
import { formatSessionTime, daysUntil } from "@/lib/textUtils";
import { pickCounterparty } from "@/lib/dashboardCounterparty";
import Tooltip from "./Tooltip";
import InfoTag from "./InfoTag";

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

    const days = workspace ? daysUntil(workspace.startTime) : 0;

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
        <Tooltip label="Join workspace" className="w-full 2xl:w-1/3">
            <button
                type="button"
                onClick={() => router.push(`/board/${workspace.id}`)}
                className="group relative w-full h-fit bg-card-background border-2 p-5 rounded-xl flex flex-col gap-6 text-left cursor-pointer gradient-border"
            >
                <div className="absolute top-5 right-5">
                    <Image
                        src="/icons/external-link.svg"
                        alt="Open workspace"
                        width={20}
                        height={20}
                        className="opacity-50 group-hover:opacity-100 transition-opacity"
                    />
                </div>
                <div className="flex flex-col gap-6 pr-8">
                    <p className="text-caption font-inter-regular gradient-text">
                        COMING UP NEXT
                    </p>
                    <div className="flex gap-5">
                        {counterparty?.imageUrl ? (
                            <div className="relative min-w-12 h-12 rounded-md overflow-hidden bg-foreground-third">
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
                        <div className="flex flex-col gap-6">
                            <div>
                                <p className="text-heading font-inter-bold">
                                    {formatSessionTime(workspace.startTime)}
                                </p>
                                <p className="text-body font-inter-bold text-foreground-second">
                                    {workspace.title}
                                </p>
                            </div>
                            {workspace.description && (
                                <div className="flex flex-col gap-1">
                                    <p className="text-caption text-foreground-third">
                                        Description
                                    </p>
                                    <p className="text-small text-foreground-second leading-5 max-h-15 overflow-y-auto">
                                        {workspace.description}
                                    </p>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <InfoTag
                                    text="60 mins"
                                    icon="/icons/clock.svg"
                                />
                                {days > 0 && (
                                    <InfoTag
                                        text={`${days} day${days !== 1 ? "s" : ""} away`}
                                        icon="/icons/calendar.svg"
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </button>
        </Tooltip>
    );
};

export default Next;
