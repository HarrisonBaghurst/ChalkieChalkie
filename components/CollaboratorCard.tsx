import React from "react";

import Image from "next/image";

type CollaboratorCardProps = {
    image: string;
    firstName: string;
    lastName: string;
    email: string;
};

const CollaboratorCard = ({
    image,
    firstName,
    lastName,
    email,
}: CollaboratorCardProps) => {
    return (
        <div className="flex justify-between items-center">
            <div className="flex gap-3 items-center p-2 rounded-full border border-transparent">
                <div className="relative w-8 h-8 rounded-full overflow-hidden">
                    <Image src={image} alt={`${firstName} icon`} fill />
                </div>
                <div className="flex flex-col">
                    <div className="text-body text-foreground">{`${firstName} ${lastName}`}</div>
                    <div className="text-caption text-foreground-third">
                        {email ? email : "Unknown email"}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CollaboratorCard;
