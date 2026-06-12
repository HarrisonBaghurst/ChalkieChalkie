import { supabaseAdmin } from "@/lib/supabase/admin";
import { Liveblocks } from "@liveblocks/node";

const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

/**
 * Tear down all resources backing a workspace: the Liveblocks room, every
 * pasted image in storage, and the Supabase `Room` row.
 *
 * Deletion order is deliberate so the operation is recoverable on partial
 * failure: the Liveblocks room goes first (if it throws, the Supabase row
 * survives for a retry), images next, and the row last. Storage list/remove
 * failures are logged but non-fatal so a missing image folder never blocks
 * the row deletion.
 *
 * Shared by the manual delete route and the inactive-room cron job.
 */
export async function deleteWorkspaceResources(roomId: string): Promise<void> {
    // delete liveblocks room first; if this fails, the supabase row stays so
    // the caller (or next cron run) can retry cleanly
    await liveblocks.deleteRoom(roomId);

    // delete images in supabase storage
    const { data: files, error: listError } = await supabaseAdmin.storage
        .from("workspace-images")
        .list(roomId);

    if (listError) {
        console.error(`Failed to list images for room ${roomId}`, listError);
    } else if (files && files.length > 0) {
        const paths = files.map((file) => `${roomId}/${file.name}`);
        const { error: removeError } = await supabaseAdmin.storage
            .from("workspace-images")
            .remove(paths);

        if (removeError) {
            console.error(
                `Failed to delete images for room ${roomId}`,
                removeError,
            );
        }
    }

    // delete supabase row last to keep state recoverable on failure
    await supabaseAdmin.from("Room").delete().eq("id", roomId);
}
