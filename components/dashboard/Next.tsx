"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { userInfo, Workspace } from "@/types/userTypes";
import { formatSessionTime, daysUntil } from "@/lib/textUtils";
import { pickCounterparty } from "@/lib/dashboardCounterparty";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Masks an SVG into the current text colour, so a tag's icon tracks the tag's
// own foreground rather than shipping a second, pre-tinted asset.
const TagIcon = ({ src }: { src: string }) => (
    <span
        aria-hidden
        className="w-3.5 h-3.5 bg-current"
        style={{
            maskImage: `url(${src})`,
            WebkitMaskImage: `url(${src})`,
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskPosition: "center",
            WebkitMaskPosition: "center",
        }}
    />
);

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
            <div className="w-full 2xl:w-1/3 h-50 bg-card-background border-2 p-4 radius-surface flex flex-col gap-3 gradient-border">
                <p className="text-caption text-foreground-second font-inter-regular">
                    Coming up next
                </p>
                <p className="text-subheading">No upcoming sessions</p>
            </div>
        );
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={() => router.push(`/board/${workspace.id}`)}
                    className="group relative w-full 2xl:w-1/3 h-fit bg-card-background border-2 p-5 radius-surface flex flex-col gap-6 text-left cursor-pointer gradient-border"
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
                            <Avatar className="size-12 rounded-md after:rounded-md">
                                <AvatarImage
                                    src={counterparty?.imageUrl}
                                    alt={`${counterparty?.firstName ?? ""} ${counterparty?.lastName ?? ""}`}
                                    className="rounded-md"
                                />
                                <AvatarFallback className="rounded-md bg-foreground-third" />
                            </Avatar>
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
                                        <p className="text-small text-foreground-second leading-5 max-h-15 overflow-y-auto pr-2">
                                            {workspace.description}
                                        </p>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <Badge>
                                        <TagIcon src="/icons/clock.svg" />
                                        60 mins
                                    </Badge>
                                    {days > 0 && (
                                        <Badge>
                                            <TagIcon src="/icons/calendar.svg" />
                                            {`${days} day${days !== 1 ? "s" : ""} away`}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </button>
            </TooltipTrigger>
            <TooltipContent>Join workspace</TooltipContent>
        </Tooltip>
    );
};

export default Next;
