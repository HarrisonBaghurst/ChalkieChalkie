import { enforceRateLimit } from "@/lib/ratelimit";
import { requireTutor } from "@/lib/serverRole";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { validateWorkspaceBody, type WorkspaceBody } from "./_shared";

/**
 * Create a new workspace for the authenticated tutor.
 *
 * @route POST /api/workspaces
 */
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
