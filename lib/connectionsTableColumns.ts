import { TableColumn } from "@/lib/tableColumns";

export type ConnectionColumnKey =
    | "person"
    | "linked"
    | "workspaces"
    | "actions";

export const CONNECTIONS_TABLE_COLUMNS = [
    { key: "person", label: "Person", minWidth: 280, pin: "left" },
    { key: "linked", label: "Linked", minWidth: 160 },
    { key: "workspaces", label: "Workspaces", minWidth: 150 },
    { key: "actions", label: "", minWidth: 56, pin: "right" },
] as const satisfies readonly TableColumn<ConnectionColumnKey>[];
