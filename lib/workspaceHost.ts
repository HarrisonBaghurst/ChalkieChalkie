import { Workspace } from "@/types/userTypes";

export const isHost = (userId: string, workspace: Workspace): boolean =>
    userId === workspace.host;
