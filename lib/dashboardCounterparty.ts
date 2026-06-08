import { userInfo, Workspace } from "@/types/userTypes";
import { isTutor } from "@/lib/roleStub";

export const pickCounterparty = (
    workspace: Workspace,
    usersMap: Record<string, userInfo>,
    viewerIsTutor: boolean,
): userInfo | null => {
    if (viewerIsTutor) {
        const firstTuteeId = workspace.collaboratorIds?.find(
            (id) => !isTutor(id, workspace),
        );
        return firstTuteeId ? (usersMap[firstTuteeId] ?? null) : null;
    }
    return usersMap[workspace.host] ?? null;
};
