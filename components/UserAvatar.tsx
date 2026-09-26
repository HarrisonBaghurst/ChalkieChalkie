import type { Expression } from "blobatar";
import Image from "next/image";

import { getFullName, getUserBlobatar } from "@/lib/userColour";
import { cn } from "@/lib/utils";

export type AvatarPerson = {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
};

interface UserAvatarProps {
    user: AvatarPerson;
    size?: "sm" | "default" | "lg";
    expression?: Expression;
    className?: string;
}

const SIZE_CLASSES = {
    sm: "size-6",
    default: "size-8",
    lg: "size-10",
};

const UserAvatar = ({
    user,
    size = "default",
    expression,
    className,
}: UserAvatarProps) => {
    const name = getFullName(user);

    return (
        <Image
            src={getUserBlobatar(user, expression)}
            alt={name}
            width={40}
            height={40}
            unoptimized
            draggable={false}
            className={cn(
                "shrink-0 select-none scale-150",
                SIZE_CLASSES[size],
                className,
            )}
        />
    );
};

export default UserAvatar;
