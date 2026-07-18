"use client";

import React from "react";
import Image from "next/image";
import { userInfo } from "@/types/userTypes";
import Tooltip from "./Tooltip";

type PeopleStackProps = {
    people: userInfo[];
};

const fullName = (person: userInfo) =>
    `${person.firstName} ${person.lastName}`.trim();

// Shows a single user avatar (with the user's name on hover) plus a "+n" tag
// for any remaining people. The tag is hoverable and lists the other users.
// Avatars use the same radius-tag style as the counterparty image in Next.tsx
// and share the Tooltip popover.
const PeopleStack = ({ people }: PeopleStackProps) => {
    if (people.length === 0) {
        return <span className="text-caption text-foreground-third">—</span>;
    }

    const [first, ...rest] = people;
    const firstName = fullName(first);

    return (
        <div className="flex items-center gap-2">
            <Tooltip label={firstName}>
                <div className="relative w-8 h-8 radius-tag overflow-hidden bg-foreground-third">
                    {first.imageUrl && (
                        <Image
                            src={first.imageUrl}
                            alt={firstName}
                            fill
                            sizes="32px"
                            className="object-cover"
                            unoptimized
                        />
                    )}
                </div>
            </Tooltip>

            {rest.length > 0 && (
                <Tooltip
                    label={
                        <div className="flex flex-col gap-1">
                            {rest.map((person) => (
                                <span key={person.id}>{fullName(person)}</span>
                            ))}
                        </div>
                    }
                >
                    <div className="flex w-8 h-8 items-center justify-center radius-tag text-caption text-foreground">
                        +{rest.length}
                    </div>
                </Tooltip>
            )}
        </div>
    );
};

export default PeopleStack;
