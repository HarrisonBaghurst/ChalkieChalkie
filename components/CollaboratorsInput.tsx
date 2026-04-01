import React, { useEffect, useState } from "react";
import CollaboratorCard from "./CollaboratorCard";
import { userInfo } from "@/types/userTypes";
import Button from "./Button";

type CollaboratorsInputProps = {
    collaborators: userInfo[];
    onSave: (collaborators: userInfo[]) => void;
};

const CollaboratorsInput = ({
    collaborators: initialCollaborators,
    onSave,
}: CollaboratorsInputProps) => {
    const [popupOpen, setPopupOpen] = useState(false);
    const [friends, setFriends] = useState<userInfo[] | null>(null);
    const [localCollaborators, setLocalCollaborators] =
        useState<userInfo[]>(initialCollaborators);
    const [localFriends, setLocalFriends] = useState<userInfo[]>([]);
    const [draggedUser, setDraggedUser] = useState<{
        user: userInfo;
        from: "collaborators" | "friends";
    } | null>(null);
    const [dragOverTarget, setDragOverTarget] = useState<
        "collaborators" | "friends" | null
    >(null);

    const areCollaboratorsEqual = (a: userInfo[], b: userInfo[]) => {
        if (a.length !== b.length) return false;

        const aEmails = a.map((u) => u.email).sort();
        const bEmails = b.map((u) => u.email).sort();

        return aEmails.every((email, i) => email === bEmails[i]);
    };

    useEffect(() => {
        setLocalCollaborators(initialCollaborators);
    }, [initialCollaborators]);

    useEffect(() => {
        const fetchFriends = async () => {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/users/friends`,
            );
            if (!res.ok) {
                console.error("Failed to fetch friends");
                return;
            }
            const data = await res.json();
            const fetchedFriends: userInfo[] = data.friends;
            setLocalFriends(
                fetchedFriends.filter(
                    (f) =>
                        !initialCollaborators.some((c) => c.email === f.email),
                ),
            );
            setFriends(fetchedFriends);
        };
        fetchFriends();
    }, []);

    const handleDragStart = (
        user: userInfo,
        from: "collaborators" | "friends",
    ) => {
        setDraggedUser({ user, from });
    };

    const handleDrop = (target: "collaborators" | "friends") => {
        if (!draggedUser || draggedUser.from === target) return;

        if (target === "collaborators") {
            setLocalCollaborators((prev) => [...prev, draggedUser.user]);
            setLocalFriends((prev) =>
                prev.filter((f) => f.email !== draggedUser.user.email),
            );
        } else {
            setLocalCollaborators((prev) =>
                prev.filter((c) => c.email !== draggedUser.user.email),
            );
            setLocalFriends((prev) => [...prev, draggedUser.user]);
        }

        setDraggedUser(null);
        setDragOverTarget(null);
    };

    const handleDiscard = () => {
        setLocalCollaborators(initialCollaborators);
        setLocalFriends(
            (friends ?? []).filter(
                (f) => !initialCollaborators.some((c) => c.email === f.email),
            ),
        );
        setPopupOpen(false);
    };

    return (
        <>
            <button
                className="flex flex-col gap-2 cursor-pointer text-left"
                onClick={() => setPopupOpen(true)}
            >
                <div className="text-sm text-foreground-third">
                    COLLABORATORS
                </div>
                <div className="flex flex-col gap-0">
                    {localCollaborators.map((collaborator, i) => (
                        <CollaboratorCard
                            key={i}
                            image={collaborator.imageUrl}
                            firstName={collaborator.firstName}
                            lastName={collaborator.lastName}
                            email={collaborator.email}
                        />
                    ))}
                </div>
            </button>

            {popupOpen && (
                <div
                    onClick={handleDiscard}
                    className="fixed left-0 top-0 w-full h-full bg-background/80 z-500"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-1/2 top-1/2 w-[40%] h-[65%] bg-[#151512] rounded-2xl border border-white/15 -translate-x-1/2 -translate-y-1/2 px-8 py-5 flex flex-col justify-between"
                    >
                        <div className="flex flex-col gap-8">
                            <div className="font-poppins-bold text-foreground text-2xl">
                                Change collaborators
                            </div>
                            <p className="text-sm text-foreground-third -mt-6">
                                Drag people between columns to add or remove
                                collaborators.
                            </p>
                            <div className="grid grid-cols-2 gap-6">
                                {/* Collaborators column */}
                                <div className="flex flex-col gap-2 text-sm text-foreground-third">
                                    <div>COLLABORATORS</div>
                                    <div
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setDragOverTarget("collaborators");
                                        }}
                                        onDragLeave={() =>
                                            setDragOverTarget(null)
                                        }
                                        onDrop={() =>
                                            handleDrop("collaborators")
                                        }
                                        className={`min-h-75 rounded-md flex flex-col p-2 transition-colors duration-150 ${
                                            dragOverTarget ===
                                                "collaborators" &&
                                            draggedUser?.from === "friends"
                                                ? "bg-white/8 ring-1 ring-white/20"
                                                : "bg-white/2"
                                        }`}
                                    >
                                        {localCollaborators.map(
                                            (collaborator, i) => {
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
                                                            image={
                                                                collaborator.imageUrl
                                                            }
                                                            firstName={
                                                                collaborator.firstName
                                                            }
                                                            lastName={
                                                                collaborator.lastName
                                                            }
                                                            email={
                                                                collaborator.email
                                                            }
                                                        />
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>
                                </div>

                                {/* Friends column */}
                                <div className="flex flex-col gap-2 text-sm text-foreground-third">
                                    <div>FRIENDS</div>
                                    <div
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setDragOverTarget("friends");
                                        }}
                                        onDragLeave={() =>
                                            setDragOverTarget(null)
                                        }
                                        onDrop={() => handleDrop("friends")}
                                        className={`min-h-75 rounded-md flex flex-col p-2 transition-colors duration-150 ${
                                            dragOverTarget === "friends" &&
                                            draggedUser?.from ===
                                                "collaborators"
                                                ? "bg-white/8 ring-1 ring-white/20"
                                                : "bg-white/2"
                                        }`}
                                    >
                                        {localFriends.map((friend) => (
                                            <div
                                                key={friend.email}
                                                draggable
                                                onDragStart={() =>
                                                    handleDragStart(
                                                        friend,
                                                        "friends",
                                                    )
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
                        </div>

                        <div className="flex gap-6 w-full">
                            <Button
                                text="Discard changes"
                                handleClick={handleDiscard}
                                variant="secondary"
                                size="large"
                                className="w-full"
                            />
                            <Button
                                text="Update collaborators"
                                handleClick={() => {
                                    onSave(localCollaborators);
                                    setPopupOpen(false);
                                }}
                                variant="primary"
                                size="large"
                                className="w-full"
                                clickable={
                                    !areCollaboratorsEqual(
                                        initialCollaborators,
                                        localCollaborators,
                                    )
                                }
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CollaboratorsInput;
