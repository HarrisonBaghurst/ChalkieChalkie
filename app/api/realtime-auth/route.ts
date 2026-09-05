import { enforceRateLimit } from "@/lib/ratelimit";
import { signTicket } from "@/lib/realtimeTicket";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
    const ipBlocked = await enforceRateLimit(request, "realtime-auth:ip");
    if (ipBlocked) return ipBlocked;

    const { userId } = await auth();

    if (!userId) {
        return new Response("Unauthorised", { status: 401 });
    }

    const userBlocked = await enforceRateLimit(
        request,
        "realtime-auth:user",
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

    const user = await currentUser();
    if (!user) {
        return new Response("Unauthorised", { status: 401 });
    }

    await supabaseAdmin.rpc("upsert_room", {
        p_id: room,
        p_last_activity_at: new Date().toISOString(),
        p_user_id: userId,
    });

    const ticket = await signTicket(userId, room, {
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        imageUrl: user.imageUrl ?? "",
        email: user.emailAddresses[0]?.emailAddress ?? "",
    });

    return Response.json({ ticket });
}
