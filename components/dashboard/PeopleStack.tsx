"use client";

import React from "react";
import Image from "next/image";
import { userInfo } from "@/types/userTypes";
import Tooltip from "./Tooltip";

type PeopleStackProps = {
    people: userInfo[];
    // How many avatars to render before stopping (excess is dropped).
    max?: number;
};

// Row of user avatars. Each avatar uses the same radius-tag style as the
// counterparty image in Next.tsx and shows the user's name on hover via the
// shared Tooltip popover.
const PeopleStack = ({ people, max = 3 }: PeopleStackProps) => {
    const shown = people.slice(0, max);

    if (shown.length === 0) {
        return <span className="text-caption text-foreground-third">—</span>;
    }

    return (
        <div className="flex items-center gap-2">
            {shown.map((person) => {
                const name = `${person.firstName} ${person.lastName}`.trim();
                return (
                    <Tooltip key={person.id} label={name}>
                        <div className="relative w-8 h-8 radius-tag overflow-hidden bg-foreground-third">
                            {person.imageUrl && (
                                <Image
                                    src={person.imageUrl}
                                    alt={name}
                                    fill
                                    sizes="32px"
                                    className="object-cover"
                                    unoptimized
                                />
                            )}
                        </div>
                    </Tooltip>
                );
            })}
        </div>
    );
};

export default PeopleStack;
