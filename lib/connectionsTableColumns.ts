// Column layout of the connections table. Shared by ConnectionsTable and its
// loading skeleton so placeholder rows stay aligned with the real ones —
// change a width here and both surfaces move together.
export const CONNECTIONS_TABLE_COLUMNS = [
    { key: "person", label: "Person", width: "w-[45%]" },
    { key: "linked", label: "Linked", width: "w-[25%]" },
    { key: "workspaces", label: "Workspaces", width: "w-[20%]" },
    { key: "actions", label: "", width: "w-[10%]" },
] as const;
