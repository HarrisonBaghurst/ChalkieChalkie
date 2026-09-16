import { reportError } from "@/lib/errorResponse";
import { enforceRateLimit } from "@/lib/ratelimit";
import { signTicket } from "@/lib/realtimeTicket";
import { entitlementsForUser } from "@/lib/serverPlan";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { boardAccessDenial, lessonInFlight } from "@/lib/workspaceLifecycle";
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
        .select(
            "id, host_id, user_ids, start_time, opens_at, expires_at, opened_at",
        )
        .eq("id", room)
        .contains("user_ids", [userId])
        .single();

    if (error || !roomData) {
        return new Response("Forbidden", { status: 403 });
    }

    const viewerIsHost = roomData.host_id === userId;

    const denial = boardAccessDenial(
        {
            opensAt: roomData.opens_at,
            expiresAt: roomData.expires_at,
            openedAt: roomData.opened_at,
        },
        viewerIsHost,
    );
    if (denial) {
        return Response.json({ reason: denial }, { status: 403 });
    }

    const hostEntitlements = await entitlementsForUser(roomData.host_id);

    if (
        !hostEntitlements &&
        !lessonInFlight({
            startTime: roomData.start_time,
            openedAt: roomData.opened_at,
        })
    ) {
        return Response.json({ reason: "host-no-plan" }, { status: 403 });
    }

    const user = await currentUser();
    if (!user) {
        return new Response("Unauthorised", { status: 401 });
    }

    if (viewerIsHost && !roomData.opened_at) {
        const { error: openError } = await supabaseAdmin
            .from("Room")
            .update({ opened_at: new Date().toISOString() })
            .eq("id", room)
            .is("opened_at", null);
        if (openError) {
            await reportError("workspace:open", openError, undefined, userId);
        }
    }

    await supabaseAdmin.rpc("upsert_room", {
        p_id: room,
        p_last_activity_at: new Date().toISOString(),
        p_user_id: userId,
    });

    const memberCount = ((roomData.user_ids ?? []) as string[]).length;
    const cap = hostEntitlements
        ? hostEntitlements.maxWorkspaceMembers
        : Math.max(memberCount, 1);

    const ticket = await signTicket(
        userId,
        room,
        {
            firstName: user.firstName ?? "",
            lastName: user.lastName ?? "",
            email: user.emailAddresses[0]?.emailAddress ?? "",
        },
        roomData.host_id,
        cap,
    );

    return Response.json({ ticket });
}
