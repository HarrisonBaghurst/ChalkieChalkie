import { errorResponse } from "@/lib/errorResponse";
import { enforceRateLimit } from "@/lib/ratelimit";
import { entitlementsForUser, planDenial } from "@/lib/serverPlan";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripStudentFromFutureRooms } from "@/lib/unlinkRooms";
import { auth } from "@clerk/nextjs/server";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ linkId: string }> },
) {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorised", { status: 401 });

    const blocked = await enforceRateLimit(req, "links:patch", userId);
    if (blocked) return blocked;

    const { linkId } = await params;
    if (!linkId) {
        return new Response("linkId is required", { status: 400 });
    }

    let body: { active?: unknown };
    try {
        body = (await req.json()) as { active?: unknown };
    } catch {
        return new Response("Invalid JSON body", { status: 400 });
    }

    if (typeof body.active !== "boolean") {
        return new Response("active must be a boolean", { status: 400 });
    }

    const { data: link, error: fetchError } = await supabaseAdmin
        .from("tutor_links")
        .select("id, tutor_id, deactivated_at")
        .eq("id", linkId)
        .single();

    if (fetchError || !link) {
        return new Response("Not found", { status: 404 });
    }

    // Only the tutor side owns the cap, so only the tutor may swap seats.
    if (link.tutor_id !== userId) {
        return new Response("Forbidden", { status: 403 });
    }

    if (body.active === !link.deactivated_at) {
        return Response.json({ active: body.active });
    }

    if (body.active) {
        const entitlements = await entitlementsForUser(userId);
        if (!entitlements) {
            return planDenial(
                "no-plan",
                "This account does not have an active plan",
            );
        }

        if (entitlements.maxLinkedStudents !== null) {
            const { count, error: countError } = await supabaseAdmin
                .from("tutor_links")
                .select("id", { count: "exact", head: true })
                .eq("tutor_id", userId)
                .is("deactivated_at", null);

            if (countError) {
                return errorResponse("links:patch", countError, 500, {
                    userId,
                });
            }

            if ((count ?? 0) >= entitlements.maxLinkedStudents) {
                return planDenial(
                    "linked-students",
                    `Your plan allows ${entitlements.maxLinkedStudents} linked students — deactivate another first`,
                    { limit: entitlements.maxLinkedStudents },
                );
            }
        }
    }

    const { error: updateError } = await supabaseAdmin
        .from("tutor_links")
        .update({
            deactivated_at: body.active ? null : new Date().toISOString(),
        })
        .eq("id", linkId);

    if (updateError) {
        return errorResponse("links:patch", updateError, 500, { userId });
    }

    return Response.json({ active: body.active });
}

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
