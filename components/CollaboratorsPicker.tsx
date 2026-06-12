import React, { useMemo, useState } from "react";
import CollaboratorCard from "./CollaboratorCard";
import { userInfo } from "@/types/userTypes";

type CollaboratorsPickerProps = {
    collaborators: userInfo[];
    friends: userInfo[];
    onChange: (collaborators: userInfo[]) => void;
};

const CollaboratorsPicker = ({
    collaborators,
    friends,
    onChange,
}: CollaboratorsPickerProps) => {
    const [draggedUser, setDraggedUser] = useState<{
        user: userInfo;
        from: "collaborators" | "friends";
    } | null>(null);
    const [dragOverTarget, setDragOverTarget] = useState<
        "collaborators" | "friends" | null
    >(null);

    const availableFriends = useMemo(
        () =>
            friends.filter(
                (f) => !collaborators.some((c) => c.email === f.email),
            ),
        [friends, collaborators],
    );

    const handleDragStart = (
        user: userInfo,
        from: "collaborators" | "friends",
    ) => {
        setDraggedUser({ user, from });
    };

    const handleDrop = (target: "collaborators" | "friends") => {
        if (!draggedUser || draggedUser.from === target) return;

        if (target === "collaborators") {
            onChange([...collaborators, draggedUser.user]);
        } else {
            onChange(
                collaborators.filter(
                    (c) => c.email !== draggedUser.user.email,
                ),
            );
        }

        setDraggedUser(null);
        setDragOverTarget(null);
    };

    return (
        <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2 text-caption text-foreground-third">
                <div>COLLABORATORS</div>
                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverTarget("collaborators");
                    }}
                    onDragLeave={() => setDragOverTarget(null)}
                    onDrop={() => handleDrop("collaborators")}
                    className={`min-h-75 rounded-md flex flex-col p-2 border transition-colors duration-150 ${
                        dragOverTarget === "collaborators" &&
                        draggedUser?.from === "friends"
                            ? "border-foreground bg-white/5"
                            : "border-foreground-third bg-transparent"
                    }`}
                >
                    {collaborators.map((collaborator, i) => {
                        const isOwner = i === 0;
                        return (
                            <div
                                key={collaborator.email}
                                draggable={!isOwner}
                                onDragStart={() =>
                                    !isOwner &&
                                    handleDragStart(
                                        collaborator,
                                        "collaborators",
                                    )
                                }
                                className={`rounded-md transition-opacity duration-100 ${
                                    isOwner
                                        ? "opacity-50 cursor-not-allowed"
                                        : "cursor-grab active:cursor-grabbing active:opacity-50"
                                }`}
                                title={
                                    isOwner
                                        ? "Owner cannot be removed"
                                        : "Drag to remove"
                                }
                            >
                                <CollaboratorCard
                                    image={collaborator.imageUrl}
                                    firstName={collaborator.firstName}
                                    lastName={collaborator.lastName}
                                    email={collaborator.email}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex flex-col gap-2 text-caption text-foreground-third">
                <div>FRIENDS</div>
                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverTarget("friends");
                    }}
                    onDragLeave={() => setDragOverTarget(null)}
                    onDrop={() => handleDrop("friends")}
                    className={`min-h-75 rounded-md flex flex-col p-2 border transition-colors duration-150 ${
                        dragOverTarget === "friends" &&
                        draggedUser?.from === "collaborators"
                            ? "border-foreground bg-white/5"
                            : "border-foreground-third bg-transparent"
                    }`}
                >
                    {availableFriends.map((friend) => (
                        <div
                            key={friend.email}
                            draggable
                            onDragStart={() =>
                                handleDragStart(friend, "friends")
                            }
                            className="cursor-grab active:cursor-grabbing active:opacity-50 rounded-md transition-opacity duration-100"
                            title="Drag to add as collaborator"
                        >
                            <CollaboratorCard
                                image={friend.imageUrl}
                                firstName={friend.firstName}
                                lastName={friend.lastName}
                                email={friend.email}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CollaboratorsPicker;
