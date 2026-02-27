import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

type RequestBody = {
    userIds: string[];
};

/**
 * Returns a list of user information corresponding to passed user ids
 *
 * @route /api/users/batch
 */
export async function POST(req: Request) {
    try {
        const body: RequestBody = await req.json();

        if (!body.userIds || !Array.isArray(body.userIds)) {
            return NextResponse.json(
                { error: "userIds must be an array" },
                { status: 400 },
            );
        }

        if (body.userIds.length === 0) {
            return NextResponse.json({ users: [] });
        }

        const userIds = body.userIds.slice(0, 500);

        const client = await clerkClient();
        const response = await client.users.getUserList({
            userId: userIds,
            limit: userIds.length,
        });

        const users = response.data.map((u) => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            imageUrl: u.imageUrl,
        }));

        const { isAuthenticated } = await auth();

        if (!isAuthenticated) {
            return new Response("Unauthorised", { status: 401 });
        }

        return new NextResponse(JSON.stringify({ users }), {
            headers: {
                "Content-Type": "application/json",
                // Vercel edge caching
                "Cache-Control":
                    "public, s-maxage=300, stale-while-revalidate=600",
            },
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "Failed to fetch users" },
            { status: 500 },
        );
    }
}
