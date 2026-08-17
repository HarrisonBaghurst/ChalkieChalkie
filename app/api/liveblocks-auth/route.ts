import { enforceRateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Liveblocks } from "@liveblocks/node";
import { NextRequest } from "next/server";

const secret_key = process.env.LIVEBLOCKS_SECRET_KEY!;

const liveblocks = new Liveblocks({
    secret: secret_key,
});

export async function POST(request: NextRequest) {
    // Per-IP guard runs before auth as cheap flood defence.
    const ipBlocked = await enforceRateLimit(request, "liveblocks-auth:ip");
    if (ipBlocked) return ipBlocked;

    const { userId } = await auth();

    if (!userId) {
        return new Response("Unauthorised", { status: 401 });
    }

    // Before any further Clerk round-trips.
    const userBlocked = await enforceRateLimit(
        request,
        "liveblocks-auth:user",
        userId,
    );
    if (userBlocked) return userBlocked;

    let room: unknown;
    try {
        ({ room } = await request.json());
    } catch {
        return new Response("Invalid JSON body", { status: 400 });
    }

    if (typeof room !== "string" || !room) {
        return new Response("Invalid room", { status: 400 });
    }

    const { data: roomData, error } = await supabaseAdmin
        .from("Room")
        .select("id")
        .eq("id", room)
        .contains("user_ids", [userId])
        .single();

    if (error || !roomData) {
        return new Response("Forbidden", { status: 403 });
    }

    // Only after auth, rate limit and membership have all passed.
    const user = await currentUser();
    if (!user) {
        return new Response("Unauthorised", { status: 401 });
    }

    await supabaseAdmin.rpc("upsert_room", {
        p_id: room,
        p_last_activity_at: new Date().toISOString(),
        p_user_id: userId,
    });

    const session = liveblocks.prepareSession(userId, {
        userInfo: {
            firstName: user.firstName ?? "",
            lastName: user.lastName ?? "",
            imageUrl: user.imageUrl ?? "",
            email: user.emailAddresses[0]?.emailAddress ?? "",
        },
    });

    session.allow(room, session.FULL_ACCESS);

    const { status, body } = await session.authorize();
    return new Response(body, { status });
}
