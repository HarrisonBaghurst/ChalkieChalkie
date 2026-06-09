import { enforceRateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

type RequestBody = {
    userIds: string[];
};

/**
 * Returns a list of user information corresponding to passed user ids.
 * Response is restricted to users who share at least one workspace with
 * the caller to prevent enumeration of arbitrary Clerk users.
 *
 * @route /api/users/batch
 */
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

        // intersect requested IDs with users who share a workspace with the
        // caller (prevents authenticated PII enumeration of arbitrary users)
        // TODO: centralise via errorResponse helper
        const { data: rooms, error: roomsError } = await supabaseAdmin
            .from("Room")
            .select("user_ids")
            .contains("user_ids", [userId]);

        if (roomsError) {
            console.error("[users/batch] Failed to fetch rooms:", roomsError);
            return NextResponse.json(
                { error: "Internal server error" },
                { status: 500 },
            );
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

        const client = await clerkClient();
        const response = await client.users.getUserList({
            userId: filteredIds,
            limit: filteredIds.length,
        });

        const users = response.data.map((u) => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            imageUrl: u.imageUrl,
            email: u.emailAddresses[0]?.emailAddress ?? null,
        }));

        return new NextResponse(JSON.stringify({ users }), {
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "private, no-store",
            },
        });
    } catch (err) {
        console.error("[users/batch] Unexpected error:", err);
        return NextResponse.json(
            { error: "Failed to fetch users" },
            { status: 500 },
        );
    }
}
