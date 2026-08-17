import { fetchUserProfiles } from "@/lib/clerkUsers";
import { errorResponse } from "@/lib/errorResponse";
import { counterpartyIdOf, listLinksFor } from "@/lib/links";
import { enforceRateLimit } from "@/lib/ratelimit";
import { userInfo } from "@/types/userTypes";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Strictly the caller's linked counterparties, never a general user search.
export async function GET(req: Request) {
    try {
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
