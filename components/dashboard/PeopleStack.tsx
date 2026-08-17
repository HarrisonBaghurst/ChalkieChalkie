"use client";

import { userInfo } from "@/types/userTypes";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type PeopleStackProps = {
    people: userInfo[]; // non-host participants
    host?: userInfo;
};

const fullName = (person: userInfo) =>
    `${person.firstName} ${person.lastName}`.trim();

const PeopleStack = ({ people, host }: PeopleStackProps) => {
    if (people.length === 0) {
        return <span className="text-caption text-foreground-third">—</span>;
    }

    const participants = host ? [host, ...people] : people;

    const [first, ...rest] = people;
    const firstName = fullName(first);

    return (
        <Tooltip>
            <TooltipTrigger className="flex items-center gap-2">
                <Avatar className="rounded-md after:rounded-md">
                    <AvatarImage
                        src={first.imageUrl}
                        alt={firstName}
                        className="rounded-md"
                    />
                    <AvatarFallback className="rounded-md bg-foreground-third">
                        {first.firstName.charAt(0)}
                    </AvatarFallback>
                </Avatar>

                {rest.length > 0 && (
                    <div className="flex w-8 h-8 items-center justify-center radius-tag text-caption text-foreground">
                        +{rest.length}
                    </div>
                )}
            </TooltipTrigger>
            <TooltipContent>
                <div className="flex flex-col gap-1">
                    <span className="text-caption text-background/50">
                        Participants ({participants.length})
                    </span>
                    {participants.map((person) => (
                        <div
                            key={person.id}
                            className="flex items-center gap-2"
                        >
                            <span>{fullName(person)}</span>
                            {host && person.id === host.id && (
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            )}
                        </div>
                    ))}
                </div>
            </TooltipContent>
        </Tooltip>
    );
};

export default PeopleStack;
