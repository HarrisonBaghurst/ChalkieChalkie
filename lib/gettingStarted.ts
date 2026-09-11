import { LinkRole } from "@/types/linkTypes";
import { actionHighlightHref } from "@/lib/dashboardActions";

export type ChecklistSurface = "dashboard" | "connections";

export type ChecklistPresentation = "page" | "card" | "hidden";

export type ChecklistCounts = {
    linkCount: number;
    workspaceCount: number;
    startedCount: number;
};

export type ChecklistRow = {
    title: string;
    body: string;
    done: boolean;
    href?: string;
    cta?: string;
};

const DASHBOARD_PATH = "/dashboard";
const CONNECTIONS_PATH = "/dashboard/connections";

export const resolvePresentation = (
    surface: ChecklistSurface,
    counts: ChecklistCounts,
): ChecklistPresentation => {
    if (counts.startedCount > 0) return "hidden";

    const hasOwnContent =
        surface === "connections"
            ? counts.linkCount > 0
            : counts.workspaceCount > 0;

    return hasOwnContent ? "card" : "page";
};

const lessonRowBody = (
    surface: ChecklistSurface,
    presentation: ChecklistPresentation,
): string => {
    if (surface === "connections")
        return "Your scheduled lessons live on the dashboard.";
    if (presentation === "card")
        return "Open it from the card beside this one when it starts.";
    return "You will be able to open it from here when it starts.";
};

const lessonRowHref = (surface: ChecklistSurface): string | undefined =>
    surface === "connections" ? DASHBOARD_PATH : undefined;

const studentRows = (
    surface: ChecklistSurface,
    presentation: ChecklistPresentation,
    counts: ChecklistCounts,
): ChecklistRow[] => [
    {
        title: "Find and link a tutor",
        body: "Ask your tutor for a link code, then enter it on the Tutors page.",
        done: counts.linkCount > 0,
        href: actionHighlightHref(CONNECTIONS_PATH, "add-link"),
        cta: "Add a tutor",
    },
    {
        title: "Your tutor schedules a lesson",
        body: "Nothing to do here. Once they book one it appears on your dashboard.",
        done: counts.workspaceCount > 0,
    },
    {
        title: "Join your first lesson",
        body: lessonRowBody(surface, presentation),
        done: counts.startedCount > 0,
        href: lessonRowHref(surface),
        cta: "Go to dashboard",
    },
];

const tutorRows = (
    surface: ChecklistSurface,
    presentation: ChecklistPresentation,
    counts: ChecklistCounts,
): ChecklistRow[] => [
    {
        title: "Link your first student",
        body: "Share a code with your student, or enter one they have sent you.",
        done: counts.linkCount > 0,
        href: actionHighlightHref(CONNECTIONS_PATH, "add-link"),
        cta: "Add a student",
    },
    {
        title: "Create your first workspace",
        body: "Pick a student and a time, and the board is ready when the lesson starts.",
        done: counts.workspaceCount > 0,
        href: actionHighlightHref(DASHBOARD_PATH, "create-workspace"),
        cta: "Schedule a lesson",
    },
    {
        title: "Run your first lesson",
        body: lessonRowBody(surface, presentation),
        done: counts.startedCount > 0,
        href: lessonRowHref(surface),
        cta: "Go to dashboard",
    },
];

export const resolveChecklist = (
    role: LinkRole,
    surface: ChecklistSurface,
    presentation: ChecklistPresentation,
    counts: ChecklistCounts,
): ChecklistRow[] => {
    const rows =
        role === "tutor"
            ? tutorRows(surface, presentation, counts)
            : studentRows(surface, presentation, counts);

    const next = rows.findIndex((row) => !row.done);

    return rows.map((row, index) =>
        index === next ? row : { ...row, href: undefined, cta: undefined },
    );
};
