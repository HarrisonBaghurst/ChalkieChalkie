import DashboardClient from "@/components/dashboard/DashboardClient";
import testWorkspaces from "@/data/testWorkspaces.json";
import { UserRole, Workspace, userInfo } from "@/types/userTypes";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getUserRole } from "@/lib/serverRole";
import { readSidebarCookie } from "@/lib/serverSidebarCookie";
import { limitsForPlan, scheduleWindow } from "@/lib/workspaceLifecycle";

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
    const sidebarCollapsed = await readSidebarCookie();

    if (process.env.ENVIRONMENT === "testing") {
        const limits = limitsForPlan();

        const upcoming: Workspace[] = testWorkspaces.upcomingLessons.map(
            (lesson) => ({
                id: lesson.id,
                title: lesson.title,
                description: lesson.description,
                host: lesson.host,
                collaboratorIds: lesson.collaboratorIds,
                startTime: lesson.startTime,
                ...scheduleWindow(lesson.startTime, limits),
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
            ...scheduleWindow(lesson.startTime, limits),
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
                        email: c.emailAddresses[0]?.emailAddress ?? u.email,
                    };
                });
            } catch (err) {
                console.error(
                    "[dashboard] failed to enrich test users from Clerk",
                    err,
                );
            }
        }

        return (
            <DashboardClient
                role={role}
                sidebarCollapsed={sidebarCollapsed}
                testData={{ workspaces, users }}
            />
        );
    }

    return <DashboardClient role={role} sidebarCollapsed={sidebarCollapsed} />;
};

export default page;
