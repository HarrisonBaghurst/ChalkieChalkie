"use client";

import { CONNECTIONS_TABLE_COLUMNS } from "@/lib/connectionsTableColumns";
import { LinkRole, LinkSummary } from "@/types/linkTypes";
import ConnectionRow from "./ConnectionRow";

type ConnectionsTableProps = {
    links: LinkSummary[];
    role: LinkRole;
    onRemove: (linkId: string) => void;
};

const ConnectionsTable = ({
    links,
    role,
    onRemove,
}: ConnectionsTableProps) => {
    const emptyLabel =
        role === "tutor"
            ? "No students yet. Share a code or enter one from a student."
            : "No tutors yet. Share a code or enter one from a tutor.";

    return (
        // Same border-separate + 13px corner trick as WorkspaceTable (see the
        // comment there): keeps the table visually rounded without an
        // overflow-hidden container, which would clip RowActionsMenu's popover.
        <div className="w-full radius-surface border border-foreground-third/15 bg-card-background">
            <table className="w-full table-fixed border-separate border-spacing-0 [&_tbody_tr:last-child>td]:border-b-0 [&_tbody_tr:last-child>td:first-child]:rounded-bl-[13px] [&_tbody_tr:last-child>td:last-child]:rounded-br-[13px]">
                <thead>
                    <tr>
                        {CONNECTIONS_TABLE_COLUMNS.map((col, i) => (
                            <th
                                key={col.key}
                                className={`${col.width} border-b border-foreground-third/15 bg-background-second px-3 py-3 text-left text-caption font-inter-regular text-foreground-third ${
                                    i === 0 ? "rounded-tl-[13px]" : ""
                                } ${
                                    i === CONNECTIONS_TABLE_COLUMNS.length - 1
                                        ? "rounded-tr-[13px]"
                                        : ""
                                }`}
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {links.length === 0 ? (
                        <tr>
                            <td
                                colSpan={CONNECTIONS_TABLE_COLUMNS.length}
                                className="px-3 py-8 text-center text-caption text-foreground-third"
                            >
                                {emptyLabel}
                            </td>
                        </tr>
                    ) : (
                        links.map((link) => (
                            <ConnectionRow
                                key={link.linkId}
                                link={link}
                                onRemove={onRemove}
                            />
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default ConnectionsTable;
