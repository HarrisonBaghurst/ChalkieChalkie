import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // ensure user is authenticated
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorised" },
                { status: 401 },
            );
        }

        // create clerk client
        const client = await clerkClient();

        // fetch users from clerk
        const usersResponse = await client.users.getUserList({
            limit: 50,
        });

        // only return necessary data
        const friends = usersResponse.data.map((user) => ({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl,
        }));

        return NextResponse.json({ friends });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "internal server error" },
            { status: 500 },
        );
    }
}
