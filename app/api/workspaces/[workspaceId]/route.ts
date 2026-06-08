import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";

/**
 * Retrieve workspace data given ID for authenticated user
 *
 * @route api/workspaces/[workspaceId]
 */
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ workspaceId: string }> },
) {
    const { userId } = await auth();

    if (!userId) {
        return new Response("Unauthorised", { status: 401 });
    }

    const { workspaceId } = await params;

    const { data, error } = await supabaseAdmin
        .from("Room")
        .select("*")
        .eq("id", workspaceId)
        .contains("user_ids", [userId]) // ensures user is a member
        .single();

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    return Response.json(data);
}

/**
 * Update workspace details in database
 *
 * @route api/workspaces/[workspaceId]
 */
export async function PATCH(req: Request) {
    const { userId } = await auth();

    if (!userId) {
        return new Response("Unauthorised", { status: 401 });
    }

    const body = await req.json();

    const { roomId, title, description, collaborators, startTime, feedback } =
        body;

    if (!roomId) {
        return new Response("roomId is required", { status: 400 });
    }

    const userIds: string[] = Array.from(
        new Set([userId, ...(collaborators || [])]),
    );

    // ensure user has right to change room details
    const { data: existingRoom, error: fetchError } = await supabaseAdmin
        .from("Room")
        .select("id, host_id")
        .eq("id", roomId)
        .single();

    if (fetchError || !existingRoom) {
        return new Response("Forbidden", { status: 403 });
    }

    const { data, error } = await supabaseAdmin
        .from("Room")
        .update({
            title,
            description,
            user_ids: userIds,
            start_time: startTime,
            feedback,
        })
        .eq("id", roomId)
        .select()
        .single();

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    return Response.json(data);
}

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorised", { status: 401 });

    const body = await req.json();
    const { roomId, title, description, collaborators, startTime, feedback } =
        body;
    if (!roomId) return new Response("roomId is required", { status: 400 });

    const userIds: string[] = Array.from(
        new Set([userId, ...(collaborators || [])]),
    );

    const { data, error } = await supabaseAdmin
        .from("Room")
        .insert({
            id: roomId,
            host_id: userId,
            user_ids: userIds,
            title: title ?? null,
            description: description ?? null,
            start_time: startTime ?? null,
            feedback: feedback ?? null,
            last_activity_at: new Date(),
        })
        .select()
        .single();

    console.error(error);
    if (error) return new Response(error.message, { status: 500 });
    return Response.json(data);
}
