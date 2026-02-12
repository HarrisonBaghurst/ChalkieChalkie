import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import UserCard from "./UserCard";
import { userInfo } from "@/types/userTypes";
import Image from "next/image";
import { getLastEditedText } from "@/lib/textUtils";

type WorkspaceCardProps = {
    title: string;
    uuid: string;
    host: string;
    collaborators: userInfo[];
    lastEdited: Date;
    loading: boolean;
};

const WorkspaceCard = ({
    title,
    uuid,
    host,
    collaborators,
    lastEdited,
    loading,
}: WorkspaceCardProps) => {
    const router = useRouter();
    const { user, isLoaded, isSignedIn } = useUser();

    const goToBoard = () => {
        router.push(`/board/${uuid}`);
    };

    if (loading || !isLoaded) return;
    if (!isSignedIn || !user) return <p>Not signed in</p>;

    const userId = user.id;

    const lastEditedText = getLastEditedText(lastEdited);

    return (
        <div className="bg-white/5 rounded-2xl border border-white/10 flex flex-col gap-6 pt-2 h-fit">
            <div className="pt-4 px-6 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h3 className="font-mont-bold text-foreground text-lg">
                        {title}
                    </h3>
                    <div className="bg-[#3a86ff]/10 px-2 py-0.5 rounded-full border border-[#3a86ff]/30">
                        <p className="text-xs text-[#3a86ff]">
                            {userId === host ? "Host" : "Guest"}
                        </p>
                    </div>
                </div>
                <p className="text-sm text-foreground-second">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
                    do eiusmod tempor incididunt ut labore et dolore magna
                    aliqua.
                </p>
                <p className="text-xs text-foreground-third">
                    {lastEditedText}
                </p>
                <div className="flex flex-col gap-3">
                    <p className="text-xs text-foreground-third">
                        COLLABORATORS
                    </p>
                    {collaborators.map((collaborator, index) => (
                        <div
                            key={index}
                            className="flex justify-between items-center"
                        >
                            <div className="flex gap-4 items-center ml-1">
                                <div className="relative w-8 h-8 bg-white/25 rounded-full overflow-hidden">
                                    <Image
                                        src={collaborator.imageUrl}
                                        alt={`${collaborator.firstName} user icon`}
                                        fill
                                    />
                                </div>
                                <p className="text-md text-foreground">
                                    {`${collaborator.firstName} ${collaborator.lastName}`}
                                </p>
                            </div>
                            <p className="text-xs text-foreground-second px-2 py-0.5 rounded-full border border-white/10 bg-white/5">
                                {collaborator.id === host ? "Host" : "Guest"}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="border-t border-white/10 px-6 py-4 bg-white/2 justify-between w-full gap-2 flex">
                <button className="bg-linear-to-b from-white/30 to-white/10 px-4 py-2 rounded-md w-fit text-sm text-foreground cursor-pointer">
                    Edit
                </button>
                <button
                    onClick={goToBoard}
                    className="bg-linear-to-b from-[#8338ec]/70 to-[#8338ec]/30 px-4 py-2 rounded-md w-full text-sm text-foreground cursor-pointer font-bold"
                >
                    Join Workspace
                </button>
            </div>
        </div>
    );

    /*
    return (
        <div className="bg-[#1d1c1c] rounded-md px-5 py-2 relative overflow-hidden">
            <div className="absolute left-0 top-0 w-1 h-full bg-[#3a86ff]" />
            <div className="flex flex-col gap-4 pb-3">
                <div>
                    <p className="text-sm text-foreground-second">
                        {userId === host ? "Host" : "Guest"}
                    </p>
                    <h3 className="font-mont-bold">{title}</h3>
                    <div className="w-full h-px bg-foreground-second mt-2" />
                </div>This
                <div>
                    <p className="text-sm text-foreground-second pb-1">
                        Collaborators
                    </p>
                    <div className="grid grid-cols-2 gap-4 flex-wrap">
                        {collaborators.map((collaborator, index) => (
                            <UserCard
                                key={index}
                                firstName={collaborator.firstName}
                                lastName={collaborator.lastName}
                                imageUrl={collaborator.imageUrl}
                                isHost={collaborator.id === host}
                            />
                        ))}
                    </div>
                </div>
                <div>
                    <p className="text-sm text-foreground-second">
                        Last edited
                    </p>
                    <p className="text-sm bg-white/3 p-2 text-foreground">
                        {formattedLastEdited}
                    </p>
                </div>
                <div className="text-sm text-foreground flex justify-between gap-4 text-center">
                    <button className="w-full rounded-md px-3 py-2 relative cursor-pointer bg-card-background border-b border-b-white/25">
                        Edit
                    </button>
                    <button
                        onClick={goToBoard}
                        className="w-full rounded-md px-3 py-2 relative cursor-pointer bg-card-background border-b border-b-white/25"
                    >
                        Join
                    </button>
                </div>
            </div>
        </div>
    );
    */
};

export default WorkspaceCard;
