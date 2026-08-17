import { errorResponse } from "@/lib/errorResponse";
import { enforceRateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: Request) {
    const { userId } = await auth();

    if (!userId) {
        return new Response("Unauthorised", { status: 401 });
    }

    const blocked = await enforceRateLimit(req, "users:workspaces", userId);
    if (blocked) return blocked;

    const { data, error } = await supabaseAdmin
        .from("Room")
        .select("*")
        .contains("user_ids", [userId]);

    if (error) {
        return errorResponse("users:workspaces", error, 500, { userId });
    }

    return Response.json(data);
}
