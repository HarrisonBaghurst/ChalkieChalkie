// Shared with the loading skeleton so placeholder rows stay aligned.
export const WORKSPACE_TABLE_COLUMNS = [
    { key: "people", label: "People", width: "w-[12%]" },
    { key: "header", label: "Header", width: "w-[22%]" },
    { key: "startTime", label: "Start time", width: "w-[15%]" },
    { key: "description", label: "Description", width: "w-[18%]" },
    { key: "feedback", label: "Feedback", width: "w-[16%]" },
    { key: "status", label: "Status", width: "w-[12%]" },
    { key: "actions", label: "", width: "w-[5%]" },
] as const;
