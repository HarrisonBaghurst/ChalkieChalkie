import { errorResponse } from "@/lib/errorResponse";
import { enforceRateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripStudentFromFutureRooms } from "@/lib/unlinkRooms";
import { auth } from "@clerk/nextjs/server";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ linkId: string }> },
) {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorised", { status: 401 });

    const blocked = await enforceRateLimit(req, "links:delete", userId);
    if (blocked) return blocked;

    const { linkId } = await params;
    if (!linkId) {
        return new Response("linkId is required", { status: 400 });
    }

    const { data: link, error: fetchError } = await supabaseAdmin
        .from("tutor_links")
        .select("id, tutor_id, student_id")
        .eq("id", linkId)
        .single();

    if (fetchError || !link) {
        return new Response("Not found", { status: 404 });
    }

    // Membership of the row is the authorisation: either party may remove it.
    if (link.tutor_id !== userId && link.student_id !== userId) {
        return new Response("Forbidden", { status: 403 });
    }

    let roomsUpdated: number;
    try {
        // Rooms first: if this throws, the link survives and Remove retries.
        roomsUpdated = await stripStudentFromFutureRooms(
            link.tutor_id,
            link.student_id,
        );
    } catch (error) {
        return errorResponse("links:delete", error, 500, { userId });
    }

    const { error: deleteError } = await supabaseAdmin
        .from("tutor_links")
        .delete()
        .eq("id", linkId);

    if (deleteError) {
        return errorResponse("links:delete", deleteError, 500, { userId });
    }

    return Response.json({ deleted: true, roomsUpdated });
}
