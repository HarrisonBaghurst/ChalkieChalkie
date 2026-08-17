import { deleteWorkspaceResources } from "@/lib/deleteWorkspace";
import { enforceRateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const INACTIVITY_HOURS = 24 * 14; // remove after 2 weeks of inactivity
const INVITE_RETENTION_DAYS = 7;

// Pruning invites is hygiene, not correctness: redemption checks expires_at,
// so an unpruned row is inert.
export async function GET(request: Request) {
    // Vercel cron injects this header whenever CRON_SECRET is set.
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response("Unauthorised", { status: 401 });
    }

    // After auth, so unauthenticated traffic never reaches Upstash.
    const blocked = await enforceRateLimit(request, "cron");
    if (blocked) return blocked;

    const cutoff = new Date(
        Date.now() - INACTIVITY_HOURS * 60 * 60 * 1000,
    ).toISOString();

    const { data: rooms, error } = await supabaseAdmin
        .from("Room")
        .select("id")
        .lt("last_activity_at", cutoff);

    if (error) {
        console.error("Failed to fetch inactive rooms:", error);
        return Response.json(
            { message: `Failed to fetch rooms`, error },
            { status: 500 },
        );
    }

    if (!rooms || rooms.length === 0) {
        return Response.json({ deleted: 0 });
    }

    let deletedCount = 0;
    for (const room of rooms) {
        try {
            await deleteWorkspaceResources(room.id);
            deletedCount++;
        } catch (err) {
            console.error(`Failed to delete room ${room.id}`, err);
        }
    }

    const inviteCutoff = new Date(
        Date.now() - INVITE_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { error: inviteError } = await supabaseAdmin
        .from("link_invites")
        .delete()
        .lt("created_at", inviteCutoff);

    if (inviteError) {
        console.error("Failed to prune old link_invites:", inviteError);
    }

    return Response.json({ deleted: deletedCount });
}
