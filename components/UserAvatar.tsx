import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getFullName, getUserColour, getUserInitials } from "@/lib/userColour";
import { cn } from "@/lib/utils";

export type AvatarPerson = {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
};

interface UserAvatarProps {
    user: AvatarPerson;
    size?: "sm" | "default" | "lg";
    shape?: "tag" | "circle";
    className?: string;
}

const UserAvatar = ({
    user,
    size = "default",
    shape = "tag",
    className,
}: UserAvatarProps) => {
    const name = getFullName(user);

    return (
        <Avatar
            size={size}
            aria-label={name || undefined}
            className={cn(
                shape === "tag" && "radius-tag after:rounded-md",
                className,
            )}
        >
            <AvatarFallback
                className={cn(
                    "font-inter-bold text-brand-foreground",
                    shape === "tag" && "radius-tag",
                )}
                style={{ backgroundColor: getUserColour(user.id) }}
            >
                {getUserInitials(user.firstName, user.lastName)}
            </AvatarFallback>
        </Avatar>
    );
};

export default UserAvatar;
