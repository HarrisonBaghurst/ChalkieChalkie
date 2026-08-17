import { Workspace } from "@/types/userTypes";

export const isHost = (userId: string, workspace: Workspace): boolean =>
    userId === workspace.host;

export const viewerIsHostOfAny = (
    userId: string | undefined | null,
    workspaces: Workspace[],
): boolean => !!userId && workspaces.some((w) => isHost(userId, w));
