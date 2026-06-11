import { enforceRateLimit } from "@/lib/ratelimit";
import { requireTutor } from "@/lib/serverRole";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";
import {
    validateWorkspaceBody,
    type WorkspaceBody,
} from "../_shared";

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
 * Update workspace details in database. True PATCH semantics: only fields
 * actually present in the request body are written to the row.
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

    // Build the update payload from keys actually present in the body, so a
    // partial PATCH only touches the columns the caller specified.
    const update: Record<string, unknown> = {};
    if ("title" in body) update.title = validated.title;
    if ("description" in body) update.description = validated.description;
    if ("startTime" in body) update.start_time = validated.startTime;
    if ("feedback" in body) update.feedback = validated.feedback;
    if ("collaborators" in body) {
        update.user_ids = Array.from(
            new Set([userId, ...validated.collaborators]),
        );
    }

    if (Object.keys(update).length === 0) {
        return new Response("No fields to update", { status: 400 });
    }

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
        .update(update)
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
