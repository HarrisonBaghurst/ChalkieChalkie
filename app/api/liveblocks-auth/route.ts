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
    // get session from Clerk
    const { userId } = await auth();
    const user = await currentUser();

    // if no user is logged in, block the request
    if (!userId || !user) {
        return new Response("Unauthorised", { status: 401 });
    }

    // get the room ID from client request
    const { room } = await request.json();

    // call Supabase function to handle data at room join
    await supabaseAdmin.rpc("upsert_room", {
        p_id: room,
        p_last_activity_at: new Date().toISOString(),
        p_user_id: userId,
    });

    // create a Liveblocks session with Clerk user data
    const session = liveblocks.prepareSession(userId, {
        userInfo: {
            email: user.emailAddresses[0].emailAddress,
        },
    });

    // grant access
    if (room) {
        session.allow(room, session.FULL_ACCESS);
    }

    // authorise and return
    const { status, body } = await session.authorize();
    return new Response(body, { status });
}
