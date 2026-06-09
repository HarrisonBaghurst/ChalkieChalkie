import { enforceRateLimit } from "@/lib/ratelimit";
import { requireTutor } from "@/lib/serverRole";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";

const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_FEEDBACK_LENGTH = 2000;
const MAX_COLLABORATORS = 100;
const CLERK_USER_ID_REGEX = /^user_[a-zA-Z0-9]+$/;

type WorkspaceBody = {
    title?: unknown;
    description?: unknown;
    collaborators?: unknown;
    startTime?: unknown;
    feedback?: unknown;
    roomId?: unknown;
};

type ValidatedFields = {
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
function validateWorkspaceBody(body: WorkspaceBody): ValidatedFields | Response {
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

/**
 * Retrieve workspace data given ID for authenticated user
 *
 * @route api/workspaces/[workspaceId]
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ workspaceId: string }> },
) {
    const { userId } = await auth();

    if (!userId) {
        return new Response("Unauthorised", { status: 401 });
    }

    const blocked = await enforceRateLimit(req, "workspace:get", userId);
    if (blocked) return blocked;

    const { workspaceId } = await params;

    const { data, error } = await supabaseAdmin
        .from("Room")
        .select("*")
        .eq("id", workspaceId)
        .contains("user_ids", [userId]) // ensures user is a member
        .single();

    if (error) {
        // TODO: centralise via errorResponse helper
        console.error("[workspace:get] Supabase error:", error);
        return new Response("Internal server error", { status: 500 });
    }

    return Response.json(data);
}

/**
 * Update workspace details in database
 *
 * @route api/workspaces/[workspaceId]
 */
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ workspaceId: string }> },
) {
    const { userId } = await auth();

    if (!userId) {
        return new Response("Unauthorised", { status: 401 });
    }

    const blocked = await enforceRateLimit(req, "workspace:patch", userId);
    if (blocked) return blocked;

    // tutor-only action
    const forbidden = await requireTutor(userId);
    if (forbidden) return forbidden;

    const { workspaceId: roomId } = await params;
    if (!roomId) {
        return new Response("roomId is required", { status: 400 });
    }

    let body: WorkspaceBody;
    try {
        body = (await req.json()) as WorkspaceBody;
    } catch {
        return new Response("Invalid JSON body", { status: 400 });
    }

    // reject mismatched roomId from body (route uses URL param as authoritative)
    if (
        body.roomId !== undefined &&
        body.roomId !== null &&
        body.roomId !== roomId
    ) {
        return new Response("roomId in body must match URL", { status: 400 });
    }

    const validated = validateWorkspaceBody(body);
    if (validated instanceof Response) return validated;

    const userIds: string[] = Array.from(
        new Set([userId, ...validated.collaborators]),
    );

    // only the host of the workspace may edit it
    const { data: existingRoom, error: fetchError } = await supabaseAdmin
        .from("Room")
        .select("id, host_id")
        .eq("id", roomId)
        .single();

    if (fetchError || !existingRoom || existingRoom.host_id !== userId) {
        return new Response("Forbidden", { status: 403 });
    }

    const { data, error } = await supabaseAdmin
        .from("Room")
        .update({
            title: validated.title,
            description: validated.description,
            user_ids: userIds,
            start_time: validated.startTime,
            feedback: validated.feedback,
        })
        .eq("id", roomId)
        .select()
        .single();

    if (error) {
        // TODO: centralise via errorResponse helper
        console.error("[workspace:patch] Supabase error:", error);
        return new Response("Internal server error", { status: 500 });
    }

    return Response.json(data);
}

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorised", { status: 401 });

    const blocked = await enforceRateLimit(req, "workspace:create", userId);
    if (blocked) return blocked;

    // tutor-only action
    const forbidden = await requireTutor(userId);
    if (forbidden) return forbidden;

    let body: WorkspaceBody;
    try {
        body = (await req.json()) as WorkspaceBody;
    } catch {
        return new Response("Invalid JSON body", { status: 400 });
    }

    const validated = validateWorkspaceBody(body);
    if (validated instanceof Response) return validated;

    // server-generated id; any client-supplied roomId is ignored
    const roomId = randomUUID();

    const userIds: string[] = Array.from(
        new Set([userId, ...validated.collaborators]),
    );

    const { data, error } = await supabaseAdmin
        .from("Room")
        .insert({
            id: roomId,
            host_id: userId,
            user_ids: userIds,
            title: validated.title,
            description: validated.description,
            start_time: validated.startTime,
            feedback: validated.feedback,
            last_activity_at: new Date(),
        })
        .select()
        .single();

    if (error) {
        // TODO: centralise via errorResponse helper
        console.error("[workspace:create] Supabase error:", error);
        // Postgres unique violation on the primary key
        if ((error as { code?: string }).code === "23505") {
            return new Response("Conflict", { status: 409 });
        }
        return new Response("Internal server error", { status: 500 });
    }

    return Response.json(data);
}
