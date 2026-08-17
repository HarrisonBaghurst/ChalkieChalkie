import React, { useMemo, useState } from "react";
import CollaboratorCard from "./CollaboratorCard";
import { cn } from "@/lib/utils";
import { userInfo } from "@/types/userTypes";

type Zone = "collaborators" | "friends";

type CollaboratorsPickerProps = {
    collaborators: userInfo[];
    friends: userInfo[];
    onChange: (collaborators: userInfo[]) => void;
};

// border-ring is a utility-layer colour, so it outranks the border shorthand
// .control-surface sets in the component layer.
const zoneClasses = (isActiveTarget: boolean) =>
    cn(
        "control-surface bg-card-background-hover flex min-h-75 flex-col p-2",
        isActiveTarget && "border-ring ring-3 ring-ring/50",
    );

const CollaboratorsPicker = ({
    collaborators,
    friends,
    onChange,
}: CollaboratorsPickerProps) => {
    const [draggedUser, setDraggedUser] = useState<{
        user: userInfo;
        from: Zone;
    } | null>(null);
    const [dragOverTarget, setDragOverTarget] = useState<Zone | null>(null);

    const availableFriends = useMemo(
        () =>
            friends.filter(
                (f) => !collaborators.some((c) => c.email === f.email),
            ),
        [friends, collaborators],
    );

    const handleDragStart = (user: userInfo, from: Zone) => {
        setDraggedUser({ user, from });
    };

    const handleDrop = (target: Zone) => {
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

    // A drop zone is a region, not a labelable control, so the caption is
    // associated with role="group" + aria-labelledby instead of htmlFor.
    const isTarget = (zone: Zone) =>
        dragOverTarget === zone &&
        draggedUser !== null &&
        draggedUser.from !== zone;

    return (
        <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
                <div
                    id="collaborators-label"
                    className="text-caption text-foreground-third"
                >
                    COLLABORATORS
                </div>
                <div
                    role="group"
                    aria-labelledby="collaborators-label"
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverTarget("collaborators");
                    }}
                    onDragLeave={() => setDragOverTarget(null)}
                    onDrop={() => handleDrop("collaborators")}
                    className={zoneClasses(isTarget("collaborators"))}
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
                                className={cn(
                                    "radius-control transition-opacity duration-100",
                                    isOwner
                                        ? "opacity-50 cursor-not-allowed"
                                        : "cursor-grab active:cursor-grabbing active:opacity-50",
                                )}
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

            <div className="flex flex-col gap-2">
                <div
                    id="friends-label"
                    className="text-caption text-foreground-third"
                >
                    FRIENDS
                </div>
                <div
                    role="group"
                    aria-labelledby="friends-label"
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverTarget("friends");
                    }}
                    onDragLeave={() => setDragOverTarget(null)}
                    onDrop={() => handleDrop("friends")}
                    className={zoneClasses(isTarget("friends"))}
                >
                    {availableFriends.length === 0 && (
                        <div className="flex-1 flex items-center justify-center p-4 text-center text-small text-foreground-third">
                            {/*  An empty column means one of two very
                                different things, and telling a tutor they
                                have no students when in fact they'd added
                                every one of them was the bug here. Key the
                                copy off `friends`, not `availableFriends`. */}
                            {friends.length === 0
                                ? "No linked students yet. Link one from Students."
                                : "All of your students are already in this workspace."}
                        </div>
                    )}
                    {availableFriends.map((friend) => (
                        <div
                            key={friend.email}
                            draggable
                            onDragStart={() =>
                                handleDragStart(friend, "friends")
                            }
                            className="cursor-grab active:cursor-grabbing active:opacity-50 radius-control transition-opacity duration-100"
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
