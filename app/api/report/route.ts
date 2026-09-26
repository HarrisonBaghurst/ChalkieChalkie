import { fetchUserProfiles } from "@/lib/clerkUsers";
import {
    ConcernReportBody,
    MAX_CONCERN_DETAILS,
    MAX_REPORTER_EMAIL,
    concernCategoryLabel,
    isConcernCategory,
} from "@/lib/concernReport";
import { errorResponse, reportError } from "@/lib/errorResponse";
import { enforceRateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getFullName, UNNAMED_USER } from "@/lib/userColour";
import { userInfo } from "@/types/userTypes";
import { auth } from "@clerk/nextjs/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ReportRoom = {
    id: string;
    title: string | null;
    user_ids: string[] | null;
};

type StoredReport = {
    reporter_id: string | null;
    reporter_email: string | null;
    category: ConcernReportBody["category"];
    workspace_id: string | null;
    reported_user_id: string | null;
    details: string;
};

const invalid = (message: string): Response =>
    Response.json({ error: message }, { status: 400 });

const optionalId = (value: unknown): string | null | undefined => {
    if (value === undefined || value === null || value === "") return null;
    return typeof value === "string" && value.length <= 200 ? value : undefined;
};

const describe = (person: userInfo | undefined, id: string): string => {
    if (!person) return id;
    const name = getFullName(person) || UNNAMED_USER;
    return person.email ? `${name} <${person.email}> (${id})` : `${name} (${id})`;
};

const notify = async (
    reportId: string,
    report: StoredReport,
    room: ReportRoom | null,
): Promise<void> => {
    const ids = [report.reporter_id, report.reported_user_id].filter(
        (id): id is string => !!id,
    );
    const profiles = new Map(
        (await fetchUserProfiles(ids)).map((profile) => [profile.id, profile]),
    );

    const reporter = report.reporter_id
        ? describe(profiles.get(report.reporter_id), report.reporter_id)
        : `Signed out, reply to ${report.reporter_email}`;

    const lines = [
        `Report: ${reportId}`,
        `Category: ${concernCategoryLabel(report.category)}`,
        `Reporter: ${reporter}`,
        `Workspace: ${room ? `${room.title || "Untitled"} (${room.id})` : "None"}`,
        `About: ${
            report.reported_user_id
                ? describe(
                      profiles.get(report.reported_user_id),
                      report.reported_user_id,
                  )
                : "No one specific"
        }`,
        "",
        report.details,
    ];

    const { error } = await resend.emails.send({
        from: "Chalkie Chalkie <onboarding@resend.dev>",
        to: [process.env.CONTACT_EMAIL!],
        subject: `Concern report: ${concernCategoryLabel(report.category)}`,
        text: lines.join("\n"),
    });

    if (error) throw error;
};

const readRoom = async (
    workspaceId: string,
    userId: string,
): Promise<ReportRoom | null> => {
    const { data, error } = await supabaseAdmin
        .from("Room")
        .select("id, title, user_ids")
        .eq("id", workspaceId)
        .contains("user_ids", [userId])
        .maybeSingle();

    if (error) throw error;
    return (data as ReportRoom | null) ?? null;
};

export async function POST(req: Request) {
    const { userId } = await auth();

    const blocked = userId
        ? await enforceRateLimit(req, "report:user", userId)
        : await enforceRateLimit(req, "report:ip");
    if (blocked) return blocked;

    let body: Partial<Record<keyof ConcernReportBody, unknown>>;
    try {
        body = await req.json();
    } catch {
        return invalid("Invalid JSON body");
    }

    if (!isConcernCategory(body.category)) return invalid("Invalid category");

    const details =
        typeof body.details === "string" ? body.details.trim() : "";
    if (!details || details.length > MAX_CONCERN_DETAILS) {
        return invalid("Describe what happened");
    }

    const workspaceId = optionalId(body.workspaceId);
    const reportedUserId = optionalId(body.reportedUserId);
    if (workspaceId === undefined || reportedUserId === undefined) {
        return invalid("Invalid workspace or person");
    }

    let email: string | null = null;
    if (!userId) {
        email = typeof body.email === "string" ? body.email.trim() : "";
        if (
            !email ||
            email.length > MAX_REPORTER_EMAIL ||
            !EMAIL_REGEX.test(email)
        ) {
            return invalid("Enter a valid email address");
        }
    }

    try {
        let room: ReportRoom | null = null;

        if (userId && workspaceId) {
            room = await readRoom(workspaceId, userId);
            if (!room) return invalid("Invalid workspace");
        }

        if (reportedUserId) {
            const members = room?.user_ids ?? [];
            if (reportedUserId === userId || !members.includes(reportedUserId)) {
                return invalid("Invalid person");
            }
        }

        const report: StoredReport = {
            reporter_id: userId ?? null,
            reporter_email: email,
            category: body.category,
            workspace_id: room?.id ?? null,
            reported_user_id: reportedUserId,
            details,
        };

        const { data, error } = await supabaseAdmin
            .from("concern_reports")
            .insert(report)
            .select("id")
            .single();

        if (error) throw error;

        try {
            await notify(data.id as string, report, room);
        } catch (notifyError) {
            await reportError("report:notify", notifyError, undefined, userId);
        }

        return Response.json({ id: data.id });
    } catch (error) {
        return errorResponse("report", error, 500, { userId });
    }
}
