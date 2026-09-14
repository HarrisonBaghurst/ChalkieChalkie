import { enforceRateLimit } from "@/lib/ratelimit";
import { planDenial, requireEntitlements } from "@/lib/serverPlan";
import { requireTutor } from "@/lib/serverRole";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
    WORKSPACES_CREATED,
    claimUsage,
    periodEnd,
    releaseUsage,
} from "@/lib/usage";
import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { scheduleWindow } from "@/lib/workspaceLifecycle";
import { validateWorkspaceBody, type WorkspaceBody } from "./_shared";

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorised", { status: 401 });

    const blocked = await enforceRateLimit(req, "workspace:create", userId);
    if (blocked) return blocked;

    const forbidden = await requireTutor(userId);
    if (forbidden) return forbidden;

    const entitlements = await requireEntitlements(userId);
    if (entitlements instanceof Response) return entitlements;

    let body: WorkspaceBody;
    try {
        body = (await req.json()) as WorkspaceBody;
    } catch {
        return new Response("Invalid JSON body", { status: 400 });
    }

    const validated = validateWorkspaceBody(body);
    if (validated instanceof Response) return validated;

    const roomId = randomUUID();

    const userIds: string[] = Array.from(
        new Set([userId, ...validated.collaborators]),
    );

    if (userIds.length > entitlements.maxWorkspaceMembers) {
        return planDenial(
            "members",
            `Your plan allows ${entitlements.maxWorkspaceMembers} people per workspace, including you`,
            {
                limit: entitlements.maxWorkspaceMembers,
                requested: userIds.length,
            },
        );
    }

    const claim = await claimUsage(
        userId,
        WORKSPACES_CREATED,
        entitlements.workspacesPerMonth,
    );

    if (!claim.allowed) {
        return planDenial(
            "quota",
            "You have used every workspace your plan allows this month",
            {
                limit: entitlements.workspacesPerMonth,
                used: claim.used,
                resetsAt: periodEnd(),
            },
        );
    }

    const window = scheduleWindow(validated.startTime, entitlements);

    const { data, error } = await supabaseAdmin
        .from("Room")
        .insert({
            id: roomId,
            host_id: userId,
            user_ids: userIds,
            title: validated.title,
            description: validated.description,
            start_time: validated.startTime,
            opens_at: window.opensAt,
            expires_at: window.expiresAt,
            feedback: validated.feedback,
            last_activity_at: new Date(),
        })
        .select()
        .single();

    if (error) {
        await releaseUsage(userId, WORKSPACES_CREATED);
        // TODO: centralise via errorResponse helper
        console.error("[workspace:create] Supabase error:", error);
        if ((error as { code?: string }).code === "23505") {
            return new Response("Conflict", { status: 409 });
        }
        return new Response("Internal server error", { status: 500 });
    }

    return Response.json(data);
}
