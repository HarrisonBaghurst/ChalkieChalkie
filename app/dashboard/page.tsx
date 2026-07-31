import DashboardClient from "@/components/dashboard/DashboardClient";
import testWorkspaces from "@/data/testWorkspaces.json";
import { UserRole, Workspace, userInfo } from "@/types/userTypes";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getUserRole } from "@/lib/serverRole";

// Resolves the account role server-side so the sidebar's tutor-only Actions
// section is correct on first paint instead of appearing once Clerk hydrates.
// A failed lookup is non-fatal: the client falls back to reading the role off
// the Clerk user object. auth() stays outside the try — it reads headers, and
// Next signals "this route can't be static" by throwing from that call, which
// must propagate rather than be swallowed as a lookup failure.
const resolveRole = async (): Promise<UserRole | undefined> => {
    const { userId } = await auth();
    if (!userId) return undefined;
    try {
        return await getUserRole(userId);
    } catch (err) {
        console.error("[dashboard] failed to resolve user role", err);
        return undefined;
    }
};

const page = async () => {
    const role = await resolveRole();

    if (process.env.ENVIRONMENT === "testing") {
        const upcoming: Workspace[] = testWorkspaces.upcomingLessons.map(
            (lesson) => ({
                id: lesson.id,
                title: lesson.title,
                description: lesson.description,
                host: lesson.host,
                collaboratorIds: lesson.collaboratorIds,
                startTime: lesson.startTime,
                lastActivity: lesson.lastActivity,
            }),
        );
        const past: Workspace[] = testWorkspaces.pastLessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            description: lesson.description,
            host: lesson.host,
            collaboratorIds: lesson.collaboratorIds,
            startTime: lesson.startTime,
            lastActivity: lesson.lastActivity,
            feedback: lesson.feedback,
        }));
        const workspaces: Workspace[] = [...upcoming, ...past];

        let users: userInfo[] = testWorkspaces.users;
        const ids = testWorkspaces.users.map((u) => u.id);
        if (ids.length > 0) {
            try {
                const client = await clerkClient();
                const response = await client.users.getUserList({
                    userId: ids,
                    limit: ids.length,
                });
                const byId = new Map(response.data.map((u) => [u.id, u]));
                users = testWorkspaces.users.map((u) => {
                    const c = byId.get(u.id);
                    if (!c) return u;
                    return {
                        id: c.id,
                        firstName: c.firstName ?? u.firstName,
                        lastName: c.lastName ?? u.lastName,
                        imageUrl: c.imageUrl ?? u.imageUrl,
                        email:
                            c.emailAddresses[0]?.emailAddress ?? u.email,
                    };
                });
            } catch (err) {
                console.error(
                    "[dashboard] failed to enrich test users from Clerk",
                    err,
                );
            }
        }

        return <DashboardClient role={role} testData={{ workspaces, users }} />;
    }

    return <DashboardClient role={role} />;
};

export default page;
