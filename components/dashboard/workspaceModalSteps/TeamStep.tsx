import React from "react";
import CollaboratorsPicker from "@/components/CollaboratorsPicker";
import { userInfo } from "@/types/userTypes";

type TeamStepProps = {
    collaborators: userInfo[];
    friends: userInfo[];
    maxMembers: number | null;
    onChange: (collaborators: userInfo[]) => void;
};

const TeamStep = ({
    collaborators,
    friends,
    maxMembers,
    onChange,
}: TeamStepProps) => {
    return (
        <div className="flex flex-col gap-4">
            <CollaboratorsPicker
                collaborators={collaborators}
                friends={friends}
                maxMembers={maxMembers}
                onChange={onChange}
            />
        </div>
    );
};

export default TeamStep;
