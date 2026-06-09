"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Button from "./Button";
import { Workspace } from "@/types/userTypes";
import { formatSessionTime } from "@/lib/textUtils";

type NextProps = {
    workspace: Workspace | null;
};

const Next = ({ workspace }: NextProps) => {
    const router = useRouter();

    return (
        <div className="w-220 bg-card-background border-2 p-4 rounded-xl flex justify-between gradient-border">
            <div className="flex flex-col gap-2">
                <p className="text-xs text-foreground-second font-inter-bold">
                    COMING UP NEXT
                </p>
                <p className="text-lg font-inter-bold">
                    {workspace ? workspace.title : "No upcoming sessions"}
                </p>
                {workspace?.description && (
                    <p className="text-xs max-w-100 text-foreground-second">
                        {workspace.description}
                    </p>
                )}
            </div>
            {workspace && (
                <div className="flex flex-col justify-center gap-2">
                    <p className="font-inter-bold text-center">
                        {formatSessionTime(workspace.startTime)}
                    </p>
                    <Button
                        text="Join Workspace"
                        onClick={() => router.push(`/board/${workspace.id}`)}
                    />
                </div>
            )}
        </div>
    );
};

export default Next;
