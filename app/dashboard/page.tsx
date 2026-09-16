import DashboardClient from "@/components/dashboard/DashboardClient";
import testWorkspaces from "@/data/testWorkspaces.json";
import { EntitlementsState } from "@/hooks/useEntitlements";
import { UserRole, Workspace, userInfo } from "@/types/userTypes";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
    entitlementsForUser,
    getUserPlan,
    grantedPlanForUser,
} from "@/lib/serverPlan";
import { getUserRole } from "@/lib/serverRole";
import { countActiveStudentLinks } from "@/lib/links";
import { reportError } from "@/lib/errorResponse";
import { PlanId } from "@/types/planTypes";
import { readSidebarCookie } from "@/lib/serverSidebarCookie";
import { readTableDensityCookie } from "@/lib/serverTableDensityCookie";
import { readUsage, usagePeriod } from "@/lib/usage";
import { scheduleWindow } from "@/lib/workspaceLifecycle";

const TEST_LIMITS = {
    leadMs: 60 * 60 * 1000,
    retentionMs: 14 * 24 * 60 * 60 * 1000,
};

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

const resolveLinkedStudents = async (
    userId: string,
): Promise<number | null> => {
    try {
        return await countActiveStudentLinks(userId);
    } catch (err) {
        await reportError("dashboard:linked-students", err, undefined, userId);
        return null;
    }
};

const resolvePlan = async (): Promise<EntitlementsState> => {
    const { userId } = await auth();
    if (!userId)
        return { entitlements: null, usage: null, linkedStudents: null };

    const [entitlements, userPlan] = await Promise.all([
        entitlementsForUser(userId),
        getUserPlan(userId),
    ]);

    const [usage, linkedStudents] = await Promise.all([
        readUsage(userId, usagePeriod(userPlan)),
        entitlements ? resolveLinkedStudents(userId) : null,
    ]);

    return { entitlements, usage, linkedStudents };
};

const resolvePlanId = async (): Promise<PlanId | null> => {
    const { userId } = await auth();
    if (!userId) return null;
    return grantedPlanForUser(userId);
};

const page = async () => {
    const role = await resolveRole();
    const plan = await resolvePlan();
    const planId = await resolvePlanId();
    const sidebarCollapsed = await readSidebarCookie();
    const tableDensity = await readTableDensityCookie();

    if (process.env.ENVIRONMENT === "testing") {
        const limits = TEST_LIMITS;

        const upcoming: Workspace[] = testWorkspaces.upcomingLessons.map(
            (lesson) => ({
                id: lesson.id,
                title: lesson.title,
                description: lesson.description,
                host: lesson.host,
                collaboratorIds: lesson.collaboratorIds,
                startTime: lesson.startTime,
                ...scheduleWindow(lesson.startTime, limits),
                openedAt: null,
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
            openedAt: lesson.startTime,
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
                plan={plan}
                planId={planId}
                sidebarCollapsed={sidebarCollapsed}
                tableDensity={tableDensity}
                testData={{ workspaces, users }}
            />
        );
    }

    return (
        <DashboardClient
            role={role}
            plan={plan}
            planId={planId}
            sidebarCollapsed={sidebarCollapsed}
            tableDensity={tableDensity}
        />
    );
};

export default page;
