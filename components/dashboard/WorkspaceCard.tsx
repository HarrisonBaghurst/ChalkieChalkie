"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Button from "./Button";
import { userInfo, Workspace } from "@/types/userTypes";
import { formatSessionTime } from "@/lib/textUtils";

type WorkspaceCardProps = {
    workspace: Workspace;
    tutee: userInfo | null;
    showFeedback: boolean;
};

const WorkspaceCard = ({
    workspace,
    tutee,
    showFeedback,
}: WorkspaceCardProps) => {
    const router = useRouter();

    return (
        <div className="flex flex-col gap-4">
            <div className="h-px w-full bg-foreground-third" />
            <div className="flex justify-between">
                <div className="flex gap-4 items-center">
                    {tutee?.imageUrl ? (
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-foreground-third">
                            <Image
                                src={tutee.imageUrl}
                                alt={`${tutee.firstName} ${tutee.lastName}`}
                                fill
                                sizes="40px"
                                className="object-cover"
                            />
                        </div>
                    ) : (
                        <div className="w-10 h-10 bg-foreground-third rounded-full" />
                    )}
                    <div className="flex flex-col gap-1">
                        {workspace.title ? (
                            <p className="text-sm font-inter-bold">
                                {workspace.title}
                            </p>
                        ) : (
                            <p className="text-sm font-inter-bold text-foreground-third">
                                Untitled workspace
                            </p>
                        )}
                        <p className="text-xs text-foreground-third max-w-65">
                            {workspace.description
                                ? workspace.description
                                : "No description"}
                        </p>
                    </div>
                </div>
                <div className="flex gap-4 items-center">
                    {workspace.startTime ? (
                        <p className="text-sm font-inter-bold">
                            {formatSessionTime(workspace.startTime)}
                        </p>
                    ) : (
                        <p className="text-sm font-inter-bold text-foreground-third">
                            Unset start time
                        </p>
                    )}
                    <Button
                        text="Join"
                        onClick={() => router.push(`/board/${workspace.id}`)}
                    />
                    <Button text="Edit" onClick={() => {}} />
                </div>
            </div>
            {showFeedback && workspace.feedback && (
                <div className="text-sm text-foreground-second">
                    {workspace.feedback}
                </div>
            )}
        </div>
    );
};

export default WorkspaceCard;
