import { enforceRateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Liveblocks } from "@liveblocks/node";

export const runtime = "nodejs";

const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

const INACTIVITY_HOURS = 24 * 14; // remove after 2 weeks of inactivity

/**
 * Delete all workspaces that are more than INACTIVITY_HOURS old from Supabase
 *
 * @route /api/cron/remove-unused-rooms
 */
export async function GET(request: Request) {
    // verify caller is Vercel cron (auto-injects this header when CRON_SECRET is set)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response("Unauthorised", { status: 401 });
    }

    // defense-in-depth rate limit after auth so unauth traffic doesn't hit Upstash
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
            // delete liveblocks room first; if this fails, the supabase row
            // stays so the next cron run retries cleanly
            await liveblocks.deleteRoom(room.id);

            // delete images in supabase storage
            const { data: files, error: listError } =
                await supabaseAdmin.storage
                    .from("workspace-images")
                    .list(room.id);

            if (listError) {
                console.error(
                    `Failed to list images for room ${room.id}`,
                    listError,
                );
            } else if (files && files.length > 0) {
                const paths = files.map((file) => `${room.id}/${file.name}`);
                const { error: removeError } = await supabaseAdmin.storage
                    .from("workspace-images")
                    .remove(paths);

                if (removeError) {
                    console.error(
                        `Failed to delete images for room ${room.id}`,
                        removeError,
                    );
                }
            }

            // delete supabase row last to keep state recoverable on failure
            await supabaseAdmin.from("Room").delete().eq("id", room.id);
            deletedCount++;
        } catch (err) {
            console.error(`Failed to delete room ${room.id}`, err);
        }
    }

    return Response.json({ deleted: deletedCount });
}
