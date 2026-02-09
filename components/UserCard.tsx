import Image from "next/image";

type UserCardProps = {
    firstName: string;
    lastName: string;
    imageUrl: string;
    isHost: boolean;
};

const UserCard = ({ firstName, lastName, imageUrl, isHost }: UserCardProps) => {
    return (
        <div className="w-full bg-white/3 py-2 pl-2 pr-2 rounded-sm flex gap-2 items-center">
            <div className="bg-white/5 w-8 h-8 rounded-full overflow-hidden relative">
                <Image src={imageUrl} alt="User image" fill />
            </div>
            <div className="">
                <p className="text-sm text-foreground">{firstName}</p>
                <p className="text-xs text-foreground-second">
                    {isHost ? "Host" : "Guest"}
                </p>
            </div>
        </div>
    );
};

export default UserCard;
