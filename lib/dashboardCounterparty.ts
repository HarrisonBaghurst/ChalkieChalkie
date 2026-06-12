import { userInfo, Workspace } from "@/types/userTypes";
import { isHost } from "@/lib/workspaceHost";

export const pickCounterparty = (
    workspace: Workspace,
    usersMap: Record<string, userInfo>,
    viewerIsHost: boolean,
): userInfo | null => {
    if (viewerIsHost) {
        const firstCollaboratorId = workspace.collaboratorIds?.find(
            (id) => !isHost(id, workspace),
        );
        return firstCollaboratorId
            ? (usersMap[firstCollaboratorId] ?? null)
            : null;
    }
    return usersMap[workspace.host] ?? null;
};
