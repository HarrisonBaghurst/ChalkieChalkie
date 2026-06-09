import { clerkClient } from "@clerk/nextjs/server";
import { UserRole } from "@/types/userTypes";

export const getUserRole = async (userId: string): Promise<UserRole> => {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return user?.publicMetadata?.role === "tutor" ? "tutor" : "student";
};

export const requireTutor = async (
    userId: string,
): Promise<Response | null> => {
    const role = await getUserRole(userId);
    if (role !== "tutor") {
        return new Response("Forbidden", { status: 403 });
    }
    return null;
};
