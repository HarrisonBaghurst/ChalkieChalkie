import { enforceRateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";

/**
 * Retrieve all workspace data that the user is a part of
 *
 * @route /api/users/workspaces
 */
export async function GET(req: Request) {
    const { userId } = await auth();

    // ensure user is authenticated
    if (!userId) {
        return new Response("Unauthorised", { status: 401 });
    }

    const blocked = await enforceRateLimit(req, "users:workspaces", userId);
    if (blocked) return blocked;

    // retrieve open board data
    const { data, error } = await supabaseAdmin
        .from("Room")
        .select("*")
        .contains("user_ids", [userId]);

    // ensure data is retrieved correctly
    if (error) {
        // TODO: centralise via errorResponse helper
        console.error("[users/workspaces] Supabase error:", error);
        return new Response("Internal server error", { status: 500 });
    }

    // return board data
    return Response.json(data);
}
