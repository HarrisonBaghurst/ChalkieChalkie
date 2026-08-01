"use client";

import { userInfo } from "@/types/userTypes";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type PeopleStackProps = {
    // Non-host participants (students). The first is shown as an avatar and any
    // remaining are collapsed into a "+n" tag.
    people: userInfo[];
    // Workspace host, listed in the hover popover and marked with a dot.
    host?: userInfo;
};

const fullName = (person: userInfo) =>
    `${person.firstName} ${person.lastName}`.trim();

// Shows a single user avatar plus a "+n" tag for any remaining people. Hovering
// anywhere over the avatar/tag reveals a titled popover listing every
// participant (host first, marked with a dot). Avatars use the same radius-tag
// style as the counterparty image in Next.tsx and share the Tooltip popover.
const PeopleStack = ({ people, host }: PeopleStackProps) => {
    // Show a dash when the host is the only participant (no students).
    if (people.length === 0) {
        return <span className="text-caption text-foreground-third">—</span>;
    }

    // Full participant list for the popover, host first.
    const participants = host ? [host, ...people] : people;

    // Avatars rendered in the row: the students.
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
