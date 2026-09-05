import { deleteWorkspaceImages } from "@/lib/r2";
import { deleteRealtimeRoom } from "@/lib/realtimeAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function deleteWorkspaceResources(roomId: string): Promise<void> {
    await deleteRealtimeRoom(roomId);

    try {
        await deleteWorkspaceImages(roomId);
    } catch (err) {
        console.error(`Failed to delete images for room ${roomId}`, err);
    }

    await supabaseAdmin.from("Room").delete().eq("id", roomId);
}
