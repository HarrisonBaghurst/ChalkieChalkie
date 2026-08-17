import { fetchUserProfiles } from "@/lib/clerkUsers";
import { errorResponse } from "@/lib/errorResponse";
import { enforceRateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

type RequestBody = {
    userIds: string[];
};

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new Response("Unauthorised", { status: 401 });
        }

        const blocked = await enforceRateLimit(req, "users:batch", userId);
        if (blocked) return blocked;

        let body: RequestBody;
        try {
            body = (await req.json()) as RequestBody;
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON body" },
                { status: 400 },
            );
        }

        if (!body.userIds || !Array.isArray(body.userIds)) {
            return NextResponse.json(
                { error: "userIds must be an array" },
                { status: 400 },
            );
        }

        if (body.userIds.length === 0) {
            return NextResponse.json({ users: [] });
        }

        const requestedIds = body.userIds
            .filter((id): id is string => typeof id === "string")
            .slice(0, 500);

        if (requestedIds.length === 0) {
            return NextResponse.json({ users: [] });
        }

        // Restricted to users sharing a workspace, so this can't enumerate
        // arbitrary Clerk accounts.
        const { data: rooms, error: roomsError } = await supabaseAdmin
            .from("Room")
            .select("user_ids")
            .contains("user_ids", [userId]);

        if (roomsError) {
            return errorResponse("users:batch", roomsError, 500, { userId });
        }

        const allowedIds = new Set<string>();
        for (const room of rooms ?? []) {
            const ids = (room.user_ids ?? []) as string[];
            for (const id of ids) allowedIds.add(id);
        }

        const filteredIds = requestedIds.filter((id) => allowedIds.has(id));

        if (filteredIds.length === 0) {
            return NextResponse.json({ users: [] });
        }

        const users = await fetchUserProfiles(filteredIds);

        return new NextResponse(JSON.stringify({ users }), {
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "private, no-store",
            },
        });
    } catch (err) {
        return errorResponse("users:batch", err, 500);
    }
}
