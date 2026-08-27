import React, { useMemo } from "react";
import CollaboratorCard from "./CollaboratorCard";
import { userInfo } from "@/types/userTypes";

type CollaboratorsPickerProps = {
    collaborators: userInfo[];
    friends: userInfo[];
    onChange: (collaborators: userInfo[]) => void;
};

const zoneClasses =
    "control-surface bg-card-background-hover flex min-h-75 flex-col p-2";

const rowClasses =
    "flex w-full items-center radius-control border border-transparent cursor-pointer text-left transition-colors outline-none hover:bg-foreground-third/10 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const CollaboratorsPicker = ({
    collaborators,
    friends,
    onChange,
}: CollaboratorsPickerProps) => {
    const availableFriends = useMemo(
        () =>
            friends.filter(
                (f) => !collaborators.some((c) => c.email === f.email),
            ),
        [friends, collaborators],
    );

    const addCollaborator = (user: userInfo) =>
        onChange([...collaborators, user]);

    const removeCollaborator = (user: userInfo) =>
        onChange(collaborators.filter((c) => c.email !== user.email));

    // A column is a region, not a labelable control, so the caption is
    // associated with role="group" + aria-labelledby instead of htmlFor.
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
                    className={zoneClasses}
                >
                    {collaborators.map((collaborator, i) => {
                        const name = `${collaborator.firstName} ${collaborator.lastName}`;
                        const card = (
                            <CollaboratorCard
                                image={collaborator.imageUrl}
                                firstName={collaborator.firstName}
                                lastName={collaborator.lastName}
                                email={collaborator.email}
                            />
                        );

                        const isOwner = i === 0;
                        if (isOwner) {
                            return (
                                <div
                                    key={collaborator.email}
                                    className="radius-control opacity-50 cursor-not-allowed"
                                    title="Owner cannot be removed"
                                >
                                    {card}
                                </div>
                            );
                        }

                        return (
                            <button
                                key={collaborator.email}
                                type="button"
                                onClick={() => removeCollaborator(collaborator)}
                                aria-label={`Remove ${name} from this workspace`}
                                className={rowClasses}
                            >
                                {card}
                            </button>
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
                    className={zoneClasses}
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
                        <button
                            key={friend.email}
                            type="button"
                            onClick={() => addCollaborator(friend)}
                            aria-label={`Add ${friend.firstName} ${friend.lastName} to this workspace`}
                            className={rowClasses}
                        >
                            <CollaboratorCard
                                image={friend.imageUrl}
                                firstName={friend.firstName}
                                lastName={friend.lastName}
                                email={friend.email}
                            />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CollaboratorsPicker;
