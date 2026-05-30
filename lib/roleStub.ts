import { Workspace } from "@/types/userTypes";

// TODO: Replace with the real tutor/tutee role field once added to the schema.
// Until then, treat the workspace host as the tutor and every other member as a tutee.
export const isTutor = (userId: string, workspace: Workspace): boolean =>
    userId === workspace.host;

export const viewerIsTutorAcrossAny = (
    userId: string | undefined | null,
    workspaces: Workspace[],
): boolean => !!userId && workspaces.some((w) => isTutor(userId, w));
