import { deleteWorkspaceImages } from "@/lib/r2";
import { deleteRealtimeRoom } from "@/lib/realtimeAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function deleteWorkspaceResources(roomId: string): Promise<void> {
    // Torn down twice, on either side of the row delete, because neither call
    // alone is enough. The first has to come before the row so a teardown that
    // throws leaves the row for the cron to retry from. But it closes the
    // sockets, and the client reconnects in ~250ms to a row that still exists,
    // mints a ticket and rebuilds the schema. The second call empties whatever
    // that resurrected; the row is gone by then, so nothing can come back.
    await deleteRealtimeRoom(roomId);

    try {
        await deleteWorkspaceImages(roomId);
    } catch (err) {
        console.error(`Failed to delete images for room ${roomId}`, err);
    }

    await supabaseAdmin.from("Room").delete().eq("id", roomId);

    try {
        await deleteRealtimeRoom(roomId);
    } catch (err) {
        console.error(`Failed second teardown for room ${roomId}`, err);
    }
}
