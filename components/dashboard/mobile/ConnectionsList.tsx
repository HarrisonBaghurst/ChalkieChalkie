"use client";

import React from "react";
import { LinkRole, LinkSummary } from "@/types/linkTypes";
import ConnectionRow from "./ConnectionRow";

type ConnectionsListProps = {
    links: LinkSummary[];
    role: LinkRole;
    onRemove: (linkId: string) => void;
};

const ConnectionsList = ({ links, role, onRemove }: ConnectionsListProps) => {
    const emptyLabel =
        role === "tutor"
            ? "No students yet. Share a code or enter one from a student."
            : "No tutors yet. Share a code or enter one from a tutor.";

    return (
        <div className="w-full overflow-hidden radius-surface border border-foreground-third/15 bg-card-background">
            {links.length === 0 ? (
                <p className="px-4 py-8 text-center text-caption text-foreground-third">
                    {emptyLabel}
                </p>
            ) : (
                links.map((link) => (
                    <ConnectionRow
                        key={link.linkId}
                        link={link}
                        onRemove={onRemove}
                    />
                ))
            )}
        </div>
    );
};

export default ConnectionsList;
