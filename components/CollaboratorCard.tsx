import React from "react";

import UserAvatar from "@/components/UserAvatar";
import { getFullName } from "@/lib/userColour";
import { userInfo } from "@/types/userTypes";

type CollaboratorCardProps = {
    user: userInfo;
};

const CollaboratorCard = ({ user }: CollaboratorCardProps) => {
    return (
        <div className="flex justify-between items-center">
            <div className="flex gap-3 items-center p-2">
                <UserAvatar
                    user={user}
                    shape="circle"
                    className="shrink-0"
                />
                <div className="flex flex-col">
                    <div className="text-body text-foreground">
                        {getFullName(user)}
                    </div>
                    <div className="text-caption text-foreground-third">
                        {user.email ? user.email : "Unknown email"}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CollaboratorCard;
