"use client";

import React, { useState } from "react";
import Button from "./Button";
import WorkspaceModal from "./WorkspaceModal";
import { userInfo, Workspace } from "@/types/userTypes";
import { useUserRole } from "@/hooks/useUserRole";

type ActionsProps = {
    friends: userInfo[];
    onCreated: (workspace: Workspace, collaborators: userInfo[]) => void;
};

const Actions = ({ friends, onCreated }: ActionsProps) => {
    const [createOpen, setCreateOpen] = useState(false);
    const role = useUserRole();

    if (role !== "tutor") return null;

    return (
        <div className="flex gap-6">
            <Button
                text="Create Workspace"
                onClick={() => setCreateOpen(true)}
            />
            <Button text="Add New Tutee" onClick={() => {}} />
            <WorkspaceModal
                open={createOpen}
                mode={{ kind: "create" }}
                friends={friends}
                onClose={() => setCreateOpen(false)}
                onSubmitted={onCreated}
            />
        </div>
    );
};

export default Actions;
