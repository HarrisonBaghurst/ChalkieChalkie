import { fetchUserProfiles } from "@/lib/clerkUsers";
import { errorResponse } from "@/lib/errorResponse";
import { counterpartyIdOf, listLinksFor } from "@/lib/links";
import { enforceRateLimit } from "@/lib/ratelimit";
import { userInfo } from "@/types/userTypes";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Retrieve the users the authenticated account is linked to: a tutor's
 * students, or a student's tutors (see app/api/links for how links are
 * formed). Role-agnostic — an admin, who can hold no links, simply gets an
 * empty list.
 *
 * @route /api/users/friends
 */
export async function GET(req: Request) {
    try {
        // ensure user is authenticated
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorised" },
                { status: 401 },
            );
        }

        const blocked = await enforceRateLimit(req, "users:friends", userId);
        if (blocked) return blocked;

        const rows = await listLinksFor(userId);
        if (rows.length === 0) {
            return NextResponse.json({ friends: [] });
        }

        const counterpartyIds = rows.map((r) => counterpartyIdOf(r, userId));
        const friends: userInfo[] = await fetchUserProfiles(counterpartyIds);

        return NextResponse.json({ friends });
    } catch (err) {
        return errorResponse("users:friends", err, 500);
    }
}
