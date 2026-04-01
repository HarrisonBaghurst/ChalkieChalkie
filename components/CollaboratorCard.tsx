import React from "react";

import Image from "next/image";

type CollaboratorCardProps = {
    image: string;
    firstName: string;
    lastName: string;
    email: string;
    handleRemove: () => void;
};

const CollaboratorCard = ({
    image,
    firstName,
    lastName,
    email,
    handleRemove,
}: CollaboratorCardProps) => {
    return (
        <div className="flex justify-between items-center">
            <div className="flex gap-3 items-center p-2 rounded-full border border-transparent">
                <div className="relative w-12 h-12 rounded-full overflow-hidden">
                    <Image src={image} alt={`${firstName} icon`} fill />
                </div>
                <div className="flex flex-col gap-0.5">
                    <div>{`${firstName} ${lastName}`}</div>
                    <div className="text-sm text-foreground-third">
                        {email ? email : "Unknown email"}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CollaboratorCard;
