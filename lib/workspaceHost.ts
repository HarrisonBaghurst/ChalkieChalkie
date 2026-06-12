import { Workspace } from "@/types/userTypes";

// Per-workspace host checks. "Host" is the creator of a workspace and is the
// only member allowed to edit it. This is distinct from the account-level
// tutor/student role stored in Clerk (see lib/serverRole.ts / useUserRole).
export const isHost = (userId: string, workspace: Workspace): boolean =>
    userId === workspace.host;

export const viewerIsHostOfAny = (
    userId: string | undefined | null,
    workspaces: Workspace[],
): boolean => !!userId && workspaces.some((w) => isHost(userId, w));
