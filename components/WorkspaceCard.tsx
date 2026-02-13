import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import UserCard from "./UserCard";
import { userInfo } from "@/types/userTypes";
import Image from "next/image";
import { getLastEditedText } from "@/lib/textUtils";
import Button from "./Button";

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
                {userId === host && (
                    <Button
                        text="Edit"
                        handleClick={() => {}}
                        variant="secondary"
                    />
                )}
                <Button
                    text="Join workspace"
                    handleClick={goToBoard}
                    variant="primary"
                    className="w-full"
                />
            </div>
        </div>
    );
};

export default WorkspaceCard;
