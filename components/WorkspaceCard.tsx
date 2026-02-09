import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import UserCard from "./UserCard";
import { userInfo } from "@/types/userTypes";

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

    const getOrdinal = (n: number) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    if (loading || !isLoaded) return;
    if (!isSignedIn || !user) return <p>Not signed in</p>;

    const weekday = new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
    }).format(lastEdited);

    const month = new Intl.DateTimeFormat("en-GB", {
        month: "long",
    }).format(lastEdited);

    const dayWithOrdinal = getOrdinal(lastEdited.getDate());

    const formattedLastEdited = `${weekday} ${dayWithOrdinal} ${month}`;

    const userId = user.id;

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
                </div>
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
};

export default WorkspaceCard;
