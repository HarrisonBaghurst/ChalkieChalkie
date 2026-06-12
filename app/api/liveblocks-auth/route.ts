import { enforceRateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Liveblocks } from "@liveblocks/node";
import { NextRequest } from "next/server";

const secret_key = process.env.LIVEBLOCKS_SECRET_KEY!;

const liveblocks = new Liveblocks({
    secret: secret_key,
});

/**
 * Authenticate incoming user to workspace with clerk and liveblocks
 *
 * @route api/liveblocks-auth
 */
export async function POST(request: NextRequest) {
    // per-IP guard before the auth call (cheap defense against floods)
    const ipBlocked = await enforceRateLimit(request, "liveblocks-auth:ip");
    if (ipBlocked) return ipBlocked;

    // get session from Clerk
    const { userId } = await auth();

    // if no user is logged in, block the request
    if (!userId) {
        return new Response("Unauthorised", { status: 401 });
    }

    // per-user limit before any further Clerk round-trips
    const userBlocked = await enforceRateLimit(
        request,
        "liveblocks-auth:user",
        userId,
    );
    if (userBlocked) return userBlocked;

    // get the room ID from client request
    let room: unknown;
    try {
        ({ room } = await request.json());
    } catch {
        return new Response("Invalid JSON body", { status: 400 });
    }

    if (typeof room !== "string" || !room) {
        return new Response("Invalid room", { status: 400 });
    }

    // ensure user is a collaborator in the workspace
    const { data: roomData, error } = await supabaseAdmin
        .from("Room")
        .select("id")
        .eq("id", room)
        .contains("user_ids", [userId])
        .single();

    if (error || !roomData) {
        return new Response("Forbidden", { status: 403 });
    }

    // fetch full user record only after auth + rate-limit + membership checks pass
    const user = await currentUser();
    if (!user) {
        return new Response("Unauthorised", { status: 401 });
    }

    // call Supabase function to handle data at room join
    await supabaseAdmin.rpc("upsert_room", {
        p_id: room,
        p_last_activity_at: new Date().toISOString(),
        p_user_id: userId,
    });

    // create a Liveblocks session with Clerk user data
    const session = liveblocks.prepareSession(userId, {
        userInfo: {
            firstName: user.firstName ?? "",
            lastName: user.lastName ?? "",
            imageUrl: user.imageUrl ?? "",
            email: user.emailAddresses[0]?.emailAddress ?? "",
        },
    });

    // grant access
    session.allow(room, session.FULL_ACCESS);

    // authorise and return
    const { status, body } = await session.authorize();
    return new Response(body, { status });
}
