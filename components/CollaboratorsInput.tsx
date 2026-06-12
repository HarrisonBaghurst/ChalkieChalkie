import React, { useEffect, useState } from "react";
import CollaboratorCard from "./CollaboratorCard";
import { userInfo } from "@/types/userTypes";
import Button from "./Button";
import CollaboratorsPicker from "./CollaboratorsPicker";

type CollaboratorsInputProps = {
    collaborators: userInfo[];
    onSave: (collaborators: userInfo[]) => void;
};

const CollaboratorsInput = ({
    collaborators: initialCollaborators,
    onSave,
}: CollaboratorsInputProps) => {
    const [popupOpen, setPopupOpen] = useState(false);
    const [localCollaborators, setLocalCollaborators] =
        useState<userInfo[]>(initialCollaborators);
    const [friends, setFriends] = useState<userInfo[]>([]);

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
            setFriends(data.friends ?? []);
        };
        fetchFriends();
    }, []);

    const handleDiscard = () => {
        setLocalCollaborators(initialCollaborators);
        setPopupOpen(false);
    };

    return (
        <>
            <button
                className="flex flex-col gap-2 cursor-pointer text-left"
                onClick={() => setPopupOpen(true)}
            >
                <div className="text-secondary text-foreground-third">
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
                        className="absolute left-1/2 top-1/2 w-[40%] h-[65%] -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between card-style"
                    >
                        <div className="flex flex-col gap-8">
                            <CollaboratorsPicker
                                collaborators={localCollaborators}
                                friends={friends}
                                onChange={setLocalCollaborators}
                            />
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
