import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";

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

    const { roomId, title, description, collaborators } = body;

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
        })
        .eq("id", roomId)
        .select()
        .single();

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    return Response.json(data);
}
