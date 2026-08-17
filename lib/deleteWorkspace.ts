import { supabaseAdmin } from "@/lib/supabase/admin";
import { Liveblocks } from "@liveblocks/node";

const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

// Order matters: each step leaves the Supabase row behind on failure, so a
// partial teardown is always retryable.
export async function deleteWorkspaceResources(roomId: string): Promise<void> {
    await liveblocks.deleteRoom(roomId);

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

    await supabaseAdmin.from("Room").delete().eq("id", roomId);
}
