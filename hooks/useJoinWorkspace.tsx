"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import OpenWorkspaceDialog from "@/components/dashboard/OpenWorkspaceDialog";
import { isStartTimeLocked } from "@/lib/workspaceLifecycle";
import { Workspace } from "@/types/userTypes";

type JoinWorkspace = {
    join: () => void;
    dialog: React.ReactNode;
};

export const useJoinWorkspace = (
    workspace: Workspace | null,
    viewerIsHost: boolean,
    now: number,
): JoinWorkspace => {
    const router = useRouter();
    const [confirming, setConfirming] = useState(false);

    const enter = () => {
        setConfirming(false);
        if (workspace) router.push(`/board/${workspace.id}`);
    };

    const needsConfirm =
        workspace !== null &&
        viewerIsHost &&
        !workspace.openedAt &&
        !isStartTimeLocked(workspace, now);

    return {
        join: () => (needsConfirm ? setConfirming(true) : enter()),
        dialog: (
            <OpenWorkspaceDialog
                open={confirming}
                onConfirm={enter}
                onCancel={() => setConfirming(false)}
            />
        ),
    };
};

export default useJoinWorkspace;
