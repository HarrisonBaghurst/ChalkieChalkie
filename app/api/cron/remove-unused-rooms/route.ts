import { supabaseAdmin } from "@/lib/supabase/admin";
import { Liveblocks } from "@liveblocks/node";

export const runtime = "nodejs";

const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

const INACTIVITY_HOURS = 24;

export async function GET() {
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
            await liveblocks.deleteRoom(room.id);

            await supabaseAdmin.from("Room").delete().eq("id", room.id);

            deletedCount++;
        } catch (err) {
            console.error(`Failed to delete room ${room.id}`, err);
        }
    }

    return Response.json({ deleted: deletedCount });
}
