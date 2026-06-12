// TODO: "friend" semantics are unimplemented. This route currently returns
// the first 50 users in the Clerk tenant for any authenticated tutor, which
// exposes name + email of arbitrary users. Replace with a real friend relation
// (mutual workspace membership, invite graph, or explicit table) before
// scaling beyond the initial user base. Known and deferred.
import { errorResponse } from "@/lib/errorResponse";
import { enforceRateLimit } from "@/lib/ratelimit";
import { requireTutor } from "@/lib/serverRole";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export type FriendMetadata = {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string;
    email: string | null;
};

/**
 * Retrieve all friends of the current authenticated user
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

        // tutor-only endpoint (used to invite collaborators into workspaces)
        const forbidden = await requireTutor(userId);
        if (forbidden) return forbidden;

        // create clerk client
        const client = await clerkClient();

        // fetch users from clerk
        const usersResponse = await client.users.getUserList({
            limit: 50,
        });

        // only return necessary data, excluding the caller themselves
        const friends = usersResponse.data
            .filter((user) => user.id !== userId)
            .map(
                (user): FriendMetadata => ({
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    imageUrl: user.imageUrl,
                    email: user.emailAddresses[0]?.emailAddress ?? null,
                }),
            );

        return NextResponse.json({ friends });
    } catch (err) {
        return errorResponse("users:friends", err, 500);
    }
}
