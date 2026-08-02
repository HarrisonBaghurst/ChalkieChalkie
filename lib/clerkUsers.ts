import { userInfo } from "@/types/userTypes";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * Resolve Clerk profiles for a set of user ids into the app's `userInfo`
 * shape. Supabase decides who a caller may see (room membership, link
 * ownership); this only ever supplies the profile data for ids that have
 * already been authorised elsewhere.
 *
 * Returns `[]` for an empty id list without calling Clerk —
 * `getUserList({ userId: [] })` ignores an empty filter and returns the
 * entire tenant, which is the exact bug the old `/api/users/friends` route
 * shipped.
 */
export async function fetchUserProfiles(ids: string[]): Promise<userInfo[]> {
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
