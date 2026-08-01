import React, { useEffect, useState } from "react";
import CollaboratorCard from "./CollaboratorCard";
import { userInfo } from "@/types/userTypes";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
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
                <div className="text-small text-foreground-third">
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

            <Dialog
                open={popupOpen}
                onOpenChange={(next) => !next && handleDiscard()}
            >
                <DialogContent
                    showCloseButton={false}
                    className="h-[65dvh] justify-between sm:max-w-[40%]"
                >
                    <DialogTitle className="sr-only">
                        Edit collaborators
                    </DialogTitle>
                    <div className="flex flex-col gap-8">
                        <CollaboratorsPicker
                            collaborators={localCollaborators}
                            friends={friends}
                            onChange={setLocalCollaborators}
                        />
                    </div>

                    <div className="flex gap-6 w-full">
                        <Button
                            variant="outline"
                            size="lg"
                            className="w-full"
                            onClick={handleDiscard}
                        >
                            Discard changes
                        </Button>
                        <Button
                            size="lg"
                            className="w-full"
                            onClick={() => {
                                onSave(localCollaborators);
                                setPopupOpen(false);
                            }}
                            disabled={areCollaboratorsEqual(
                                initialCollaborators,
                                localCollaborators,
                            )}
                        >
                            Update collaborators
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default CollaboratorsInput;
