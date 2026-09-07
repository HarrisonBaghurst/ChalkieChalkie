import { deleteWorkspaceResources } from "@/lib/deleteWorkspace";
import { errorResponse } from "@/lib/errorResponse";
import { enforceRateLimit } from "@/lib/ratelimit";
import { evictRoomMembers } from "@/lib/realtimeAdmin";
import { requireTutor } from "@/lib/serverRole";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";
import {
    isStartTimeLocked,
    limitsForPlan,
    sameInstant,
    scheduleWindow,
} from "@/lib/workspaceLifecycle";
import {
    validateWorkspaceBody,
    type WorkspaceBody,
} from "../_shared";

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
        return errorResponse("workspace:get", error, 500, { userId });
    }

    return Response.json(data);
}

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

    // The URL param is authoritative; a body roomId may only agree with it.
    if (
        body.roomId !== undefined &&
        body.roomId !== null &&
        body.roomId !== roomId
    ) {
        return new Response("roomId in body must match URL", { status: 400 });
    }

    const validated = validateWorkspaceBody(body);
    if (validated instanceof Response) return validated;

    // Keyed on presence, not value, so a PATCH only touches what it names.
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

    const { data: existingRoom, error: fetchError } = await supabaseAdmin
        .from("Room")
        .select("*")
        .eq("id", roomId)
        .single();

    if (fetchError || !existingRoom || existingRoom.host_id !== userId) {
        return new Response("Forbidden", { status: 403 });
    }

    if ("startTime" in body) {
        const unchanged = sameInstant(
            validated.startTime,
            existingRoom.start_time,
        );

        if (isStartTimeLocked(existingRoom.opens_at)) {
            if (!unchanged) {
                return new Response(
                    "Start time is locked once the workspace has opened",
                    { status: 409 },
                );
            }
            delete update.start_time;
        } else {
            const window = scheduleWindow(
                validated.startTime,
                limitsForPlan(),
            );
            update.opens_at = window.opensAt;
            update.expires_at = window.expiresAt;
        }
    }

    if (Object.keys(update).length === 0) {
        return Response.json(existingRoom);
    }

    const { data, error } = await supabaseAdmin
        .from("Room")
        .update(update)
        .eq("id", roomId)
        .select()
        .single();

    if (error) {
        return errorResponse("workspace:patch", error, 500, { userId });
    }

    const nextUserIds = update.user_ids as string[] | undefined;
    if (nextUserIds) {
        const removed = ((existingRoom.user_ids ?? []) as string[]).filter(
            (id) => !nextUserIds.includes(id),
        );
        await evictRoomMembers(
            removed.map((removedId) => ({ roomId, userId: removedId })),
        );
    }

    return Response.json(data);
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ workspaceId: string }> },
) {
    const { userId } = await auth();

    if (!userId) {
        return new Response("Unauthorised", { status: 401 });
    }

    const blocked = await enforceRateLimit(req, "workspace:delete", userId);
    if (blocked) return blocked;

    const forbidden = await requireTutor(userId);
    if (forbidden) return forbidden;

    const { workspaceId: roomId } = await params;
    if (!roomId) {
        return new Response("roomId is required", { status: 400 });
    }

    const { data: existingRoom, error: fetchError } = await supabaseAdmin
        .from("Room")
        .select("id, host_id")
        .eq("id", roomId)
        .single();

    if (fetchError || !existingRoom || existingRoom.host_id !== userId) {
        return new Response("Forbidden", { status: 403 });
    }

    try {
        await deleteWorkspaceResources(roomId);
    } catch (error) {
        return errorResponse("workspace:delete", error, 500, { userId });
    }

    return Response.json({ deleted: true });
}
