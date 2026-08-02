import { errorResponse } from "@/lib/errorResponse";
import { enforceRateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripStudentFromFutureRooms } from "@/lib/unlinkRooms";
import { auth } from "@clerk/nextjs/server";

/**
 * Remove a tutor_links row. Either side may remove it — membership of the
 * row is the authorisation, not role. Also strips the student from every
 * future-dated room hosted by the tutor half of the link (see
 * lib/unlinkRooms.ts for what "future" means and the Liveblocks caveat).
 *
 * @route DELETE /api/links/[linkId]
 */
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

    // Membership of the row is the authorisation — either party may remove
    // it, and this single check is what makes that true for free.
    if (link.tutor_id !== userId && link.student_id !== userId) {
        return new Response("Forbidden", { status: 403 });
    }

    let roomsUpdated: number;
    try {
        // Rooms first, relation row last: if this throws, the link survives
        // and the caller can retry by hitting Remove again.
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
