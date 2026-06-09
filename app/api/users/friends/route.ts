import { enforceRateLimit } from "@/lib/ratelimit";
import { requireTutor } from "@/lib/serverRole";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export type FriendMetadata = {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string;
    email: string;
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

        // tutor-only endpoint (used to invite tutees into workspaces)
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
                    email: user.emailAddresses[0].emailAddress,
                }),
            );

        return NextResponse.json({ friends });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "internal server error" },
            { status: 500 },
        );
    }
}
