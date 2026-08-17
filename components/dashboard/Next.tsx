"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { userInfo, Workspace } from "@/types/userTypes";
import { cn } from "@/lib/utils";
import { formatSessionTime, daysUntil } from "@/lib/textUtils";
import { pickCounterparty } from "@/lib/dashboardCounterparty";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Masked rather than tinted, so the icon tracks its tag's text colour.
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

const NextContent = ({
    workspace,
    counterparty,
    days,
}: {
    workspace: Workspace;
    counterparty: userInfo | null;
    days: number;
}) => (
    <div className="flex flex-col gap-6 2xl:pr-8">
        <p className="text-caption font-inter-regular gradient-text">
            COMING UP NEXT
        </p>
        {/* A grid rather than nested flex, because the two layouts differ in
            shape and not just direction: on a phone the avatar sits beside the
            time only, with the description and tags running the full width
            beneath it; from 2xl every text block shares the avatar's second
            column. Rows are auto-placed, so dropping the description closes
            its row instead of leaving a doubled gap behind. */}
        <div className="grid grid-cols-[auto_1fr] items-start gap-x-5 gap-y-6">
            <Avatar className="size-12 rounded-md after:rounded-md">
                <AvatarImage
                    src={counterparty?.imageUrl}
                    alt={`${counterparty?.firstName ?? ""} ${counterparty?.lastName ?? ""}`}
                    className="rounded-md"
                />
                <AvatarFallback className="rounded-md bg-foreground-third" />
            </Avatar>
            <div>
                <p className="text-heading font-inter-bold">
                    {formatSessionTime(workspace.startTime)}
                </p>
                <p className="text-body font-inter-bold text-foreground-second">
                    {workspace.title}
                </p>
            </div>
            {workspace.description && (
                <div className="col-span-2 flex flex-col gap-1 2xl:col-span-1 2xl:col-start-2">
                    <p className="text-caption text-foreground-third">
                        Description
                    </p>
                    <p className="text-small text-foreground-second leading-5 max-h-15 overflow-y-auto pr-2">
                        {workspace.description}
                    </p>
                </div>
            )}
            <div className="col-span-2 flex flex-wrap gap-2 2xl:col-span-1 2xl:col-start-2">
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
);

// No `display` utility: each wrapper sets its own, and a baked-in `flex` would
// fight the `hidden` it needs at the other breakpoint.
const CARD_CLASS =
    "w-full 2xl:w-1/3 h-fit bg-card-background border-2 p-5 radius-surface flex-col gap-6 gradient-border";

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
        <>
            {/* Below 2xl the card is inert: the board is desktop-only for now,
                so nothing here links to it. Rendered as a separate element
                rather than a disabled button so there is no tap target and no
                open-in-new affordance to mislead. */}
            <div className={cn(CARD_CLASS, "flex 2xl:hidden")}>
                <NextContent
                    workspace={workspace}
                    counterparty={counterparty}
                    days={days}
                />
                <p className="text-caption text-foreground-third">
                    Open Chalkie Chalkie on a computer to join this workspace.
                </p>
            </div>

            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onClick={() => router.push(`/board/${workspace.id}`)}
                        className={cn(
                            CARD_CLASS,
                            "group relative hidden text-left cursor-pointer 2xl:flex",
                        )}
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
                        <NextContent
                            workspace={workspace}
                            counterparty={counterparty}
                            days={days}
                        />
                    </button>
                </TooltipTrigger>
                <TooltipContent>Join workspace</TooltipContent>
            </Tooltip>
        </>
    );
};

export default Next;
