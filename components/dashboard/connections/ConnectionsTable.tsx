"use client";

import { CONNECTIONS_TABLE_COLUMNS } from "@/lib/connectionsTableColumns";
import { LinkRole, LinkSummary } from "@/types/linkTypes";
import DataTable from "../DataTable";
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
        <DataTable columns={CONNECTIONS_TABLE_COLUMNS} empty={emptyLabel}>
            {links.map((link) => (
                <ConnectionRow
                    key={link.linkId}
                    link={link}
                    onRemove={onRemove}
                />
            ))}
        </DataTable>
    );
};

export default ConnectionsTable;
