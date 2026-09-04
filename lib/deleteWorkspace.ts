import { deleteWorkspaceImages } from "@/lib/r2";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Liveblocks } from "@liveblocks/node";

const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

// Order matters: each step leaves the Supabase row behind on failure, so a
// partial teardown is always retryable.
export async function deleteWorkspaceResources(roomId: string): Promise<void> {
    await liveblocks.deleteRoom(roomId);

    try {
        await deleteWorkspaceImages(roomId);
    } catch (err) {
        console.error(`Failed to delete images for room ${roomId}`, err);
    }

    await supabaseAdmin.from("Room").delete().eq("id", roomId);
}
