import { errorResponse, reportError } from "@/lib/errorResponse";
import {
    parsePlanStatus,
    statusGrantsEntitlements,
} from "@/lib/plans/entitlements";
import { enforceRateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";

// One query for every host on the list, not one per row: a student with twenty
// lessons across three tutors costs a single lookup.
const hostsWithPlans = async (
    hostIds: string[],
    userId: string,
): Promise<Set<string>> => {
    if (hostIds.length === 0) return new Set();

    const { data, error } = await supabaseAdmin
        .from("user_plans")
        .select("user_id, status")
        .in("user_id", hostIds);

    if (error) {
        await reportError("users:workspaces:plans", error, undefined, userId);
        return new Set(hostIds);
    }

    const granted = new Set<string>();
    for (const row of data ?? []) {
        const status = parsePlanStatus(row.status);
        if (status && statusGrantsEntitlements(status)) {
            granted.add(row.user_id as string);
        }
    }
    return granted;
};

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

    const rooms = data ?? [];
    const granted = await hostsWithPlans(
        Array.from(new Set(rooms.map((room) => room.host_id as string))),
        userId,
    );

    return Response.json(
        rooms.map((room) => ({
            ...room,
            host_has_plan: granted.has(room.host_id as string),
        })),
    );
}
