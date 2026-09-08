import { userInfo, Workspace } from "@/types/userTypes";
import { isHost } from "@/lib/workspaceHost";

export const pickCounterparties = (
    workspace: Workspace,
    usersMap: Record<string, userInfo>,
    viewerId: string | undefined | null,
): userInfo[] => {
    const ids =
        viewerId && isHost(viewerId, workspace)
            ? (workspace.collaboratorIds ?? []).filter(
                  (id) => !isHost(id, workspace),
              )
            : [workspace.host];

    return ids.map((id) => usersMap[id]).filter((u): u is userInfo => !!u);
};

export const pickCounterparty = (
    workspace: Workspace,
    usersMap: Record<string, userInfo>,
    viewerId: string | undefined | null,
): userInfo | null =>
    pickCounterparties(workspace, usersMap, viewerId)[0] ?? null;
