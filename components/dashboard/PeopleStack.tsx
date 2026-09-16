"use client";

import { userInfo } from "@/types/userTypes";
import TapTooltip from "@/components/TapTooltip";
import UserAvatar from "@/components/UserAvatar";
import { getFullName } from "@/lib/userColour";

type PeopleStackProps = {
    people: userInfo[]; // stacked avatars, viewer-relative
    participants: userInfo[]; // the whole room, host first
    hostId?: string;
};

const PeopleStack = ({ people, participants, hostId }: PeopleStackProps) => {
    if (people.length === 0) {
        return <span className="text-caption text-foreground-third">—</span>;
    }

    const [first, ...rest] = people;

    return (
        <TapTooltip
            content={
                <div className="flex flex-col gap-1">
                    <span className="text-caption text-background/50">
                        Participants ({participants.length})
                    </span>
                    {participants.map((person) => (
                        <div
                            key={person.id}
                            className="flex items-center gap-2"
                        >
                            <span>{getFullName(person)}</span>
                            {person.id === hostId && (
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            )}
                        </div>
                    ))}
                </div>
            }
        >
            <button
                type="button"
                className="flex items-center gap-2"
            >
                <UserAvatar user={first} />

                {rest.length > 0 && (
                    <div className="flex w-8 h-8 items-center justify-center radius-tag text-caption text-foreground">
                        +{rest.length}
                    </div>
                )}
            </button>
        </TapTooltip>
    );
};

export default PeopleStack;
