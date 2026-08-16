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

/*  Both drop zones wear the same chrome as `Input`/`Textarea` — the
    `.control-surface` hairline over a card-background-hover fill, a tier
    lighter than the modal they sit on — so the picker reads as a field
    rather than a hand-drawn box.

    The active drop target reuses Input's focus-visible treatment
    (border-ring plus the ring) instead of the literal white tint this
    replaced, so "this is where the drop lands" looks the same as "this
    field has focus". `border-ring` is a utility-layer border-colour, which
    outranks the `border` shorthand `.control-surface` sets in the component
    layer — the same mechanism as the bg override. */
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

    /*  A <label htmlFor> would be invalid here — a drop zone is a region, not
        a labelable control — so the caption is associated the equivalent way,
        via role="group" + aria-labelledby, and styled exactly as the field
        captions in BasicsStep. */
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
