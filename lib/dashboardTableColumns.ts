import { TableColumn } from "@/lib/tableColumns";

export type WorkspaceColumnKey =
    | "people"
    | "header"
    | "startTime"
    | "description"
    | "feedback"
    | "status"
    | "actions";

export const WORKSPACE_TABLE_COLUMNS = [
    { key: "people", label: "People", minWidth: 96 },
    { key: "header", label: "Header", minWidth: 240, pin: "left" },
    { key: "startTime", label: "Start time", minWidth: 170 },
    { key: "description", label: "Description", minWidth: 220 },
    { key: "feedback", label: "Feedback", minWidth: 220 },
    { key: "status", label: "Status", minWidth: 175 },
    { key: "actions", label: "", minWidth: 56, pin: "right" },
] as const satisfies readonly TableColumn<WorkspaceColumnKey>[];
