const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_FEEDBACK_LENGTH = 2000;
const MAX_COLLABORATORS = 100;
const CLERK_USER_ID_REGEX = /^user_[a-zA-Z0-9]+$/;

export type WorkspaceBody = {
    title?: unknown;
    description?: unknown;
    collaborators?: unknown;
    startTime?: unknown;
    feedback?: unknown;
    roomId?: unknown;
};

export type ValidatedFields = {
    title: string | null;
    description: string | null;
    feedback: string | null;
    startTime: string | null;
    collaborators: string[];
};

/**
 * Parse + validate the optional workspace fields. Returns a 400 Response on
 * the first validation failure, or a ValidatedFields object on success.
 */
export function validateWorkspaceBody(
    body: WorkspaceBody,
): ValidatedFields | Response {
    const { title, description, collaborators, startTime, feedback } = body;

    if (
        title !== undefined &&
        title !== null &&
        (typeof title !== "string" || title.length > MAX_TITLE_LENGTH)
    ) {
        return new Response("Invalid title", { status: 400 });
    }

    if (
        description !== undefined &&
        description !== null &&
        (typeof description !== "string" ||
            description.length > MAX_DESCRIPTION_LENGTH)
    ) {
        return new Response("Invalid description", { status: 400 });
    }

    if (
        feedback !== undefined &&
        feedback !== null &&
        (typeof feedback !== "string" || feedback.length > MAX_FEEDBACK_LENGTH)
    ) {
        return new Response("Invalid feedback", { status: 400 });
    }

    if (
        startTime !== undefined &&
        startTime !== null &&
        typeof startTime !== "string"
    ) {
        return new Response("Invalid startTime", { status: 400 });
    }

    let collaboratorIds: string[] = [];
    if (collaborators !== undefined && collaborators !== null) {
        if (!Array.isArray(collaborators)) {
            return new Response("Invalid collaborators", { status: 400 });
        }
        if (collaborators.length > MAX_COLLABORATORS) {
            return new Response("Too many collaborators", { status: 400 });
        }
        for (const id of collaborators) {
            if (typeof id !== "string" || !CLERK_USER_ID_REGEX.test(id)) {
                return new Response("Invalid collaborator id", { status: 400 });
            }
        }
        collaboratorIds = collaborators as string[];
    }

    return {
        title: (title as string | null | undefined) ?? null,
        description: (description as string | null | undefined) ?? null,
        feedback: (feedback as string | null | undefined) ?? null,
        startTime: (startTime as string | null | undefined) ?? null,
        collaborators: collaboratorIds,
    };
}
