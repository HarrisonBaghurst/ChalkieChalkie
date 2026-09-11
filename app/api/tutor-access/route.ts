import { auth, clerkClient } from "@clerk/nextjs/server";
import { errorResponse } from "@/lib/errorResponse";
import { enforceRateLimit } from "@/lib/ratelimit";
import { parseUserRole } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const contactEmail = process.env.CONTACT_EMAIL!;

const SUBJECT = "Tutor Access Request";
const MAX_BODY_LENGTH = 10_000;

interface TutorAccessPayload {
    body: string;
}

export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const blocked = await enforceRateLimit(req, "tutor-access", userId);
    if (blocked) return blocked;

    let payload: TutorAccessPayload;
    try {
        payload = (await req.json()) as TutorAccessPayload;
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON body" },
            { status: 400 },
        );
    }

    const { body } = payload;

    if (typeof body !== "string" || !body) {
        return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 },
        );
    }

    if (body.length > MAX_BODY_LENGTH) {
        return NextResponse.json({ error: "Field too long" }, { status: 400 });
    }

    try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);

        const name = [user.firstName, user.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();

        const identity = [
            `Clerk ID: ${userId}`,
            `Account email: ${user.primaryEmailAddress?.emailAddress ?? "unknown"}`,
            `Name: ${name || "unknown"}`,
            `Current role: ${parseUserRole(user.publicMetadata?.role)}`,
        ].join("\n");

        const { data, error } = await resend.emails.send({
            from: "Chalkie Chalkie <onboarding@resend.dev>",
            to: [contactEmail],
            subject: SUBJECT,
            text: `${identity}\n\n---\n\n${body}`,
        });

        if (error) {
            return errorResponse("tutor-access:resend", error, 500, { userId });
        }

        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        return errorResponse("tutor-access", error, 500, { userId });
    }
}
