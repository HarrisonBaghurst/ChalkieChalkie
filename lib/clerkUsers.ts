import { userInfo } from "@/types/userTypes";
import { clerkClient } from "@clerk/nextjs/server";

export async function fetchUserProfiles(ids: string[]): Promise<userInfo[]> {
    // getUserList({ userId: [] }) ignores the filter and returns every user.
    if (ids.length === 0) return [];

    const client = await clerkClient();
    const response = await client.users.getUserList({
        userId: ids,
        limit: ids.length,
    });

    return response.data.map(
        (u): userInfo => ({
            id: u.id,
            firstName: u.firstName ?? "",
            lastName: u.lastName ?? "",
            imageUrl: u.imageUrl,
            email: u.emailAddresses[0]?.emailAddress ?? "",
        }),
    );
}
