import { deleteWorkspaceResources } from "@/lib/deleteWorkspace";
import { enforceRateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const INVITE_RETENTION_DAYS = 7;
const DELETE_BATCH = 500;
const TIME_BUDGET_MS = 45_000;

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

    const cutoff = new Date().toISOString();

    const startedAt = Date.now();
    let deletedCount = 0;
    let remaining = false;
    const failed = new Set<string>();

    for (;;) {
        const { data: rooms, error } = await supabaseAdmin
            .from("Room")
            .select("id")
            .lt("expires_at", cutoff)
            .limit(DELETE_BATCH);

        if (error) {
            console.error("Failed to fetch expired rooms:", error);
            return Response.json(
                { message: `Failed to fetch rooms`, error },
                { status: 500 },
            );
        }

        const pending = (rooms ?? []).filter((room) => !failed.has(room.id));
        if (pending.length === 0) break;

        for (const room of pending) {
            if (Date.now() - startedAt > TIME_BUDGET_MS) {
                remaining = true;
                break;
            }
            try {
                await deleteWorkspaceResources(room.id);
                deletedCount++;
            } catch (err) {
                console.error(`Failed to delete room ${room.id}`, err);
                failed.add(room.id);
            }
        }

        if (remaining) break;
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

    return Response.json({
        deleted: deletedCount,
        failed: failed.size,
        remaining,
    });
}
