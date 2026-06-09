import { enforceRateLimit } from "@/lib/ratelimit";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const contactEmail = process.env.CONTACT_EMAIL!;

const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 10_000;

interface ContactPayload {
    title: string;
    body: string;
}

export async function POST(req: NextRequest) {
    const blocked = await enforceRateLimit(req, "contact");
    if (blocked) return blocked;

    let payload: ContactPayload;
    try {
        payload = (await req.json()) as ContactPayload;
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON body" },
            { status: 400 },
        );
    }

    const { title, body } = payload;

    if (
        typeof title !== "string" ||
        typeof body !== "string" ||
        !title ||
        !body
    ) {
        return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 },
        );
    }

    if (title.length > MAX_TITLE_LENGTH || body.length > MAX_BODY_LENGTH) {
        return NextResponse.json(
            { error: "Field too long" },
            { status: 400 },
        );
    }

    try {
        // TODO: centralise via errorResponse helper
        const { data, error } = await resend.emails.send({
            from: "Chalkie Chalkie <onboarding@resend.dev>",
            to: [contactEmail],
            subject: title,
            text: body,
        });

        if (error) {
            console.error("[contact] Resend error:", error);
            return NextResponse.json(
                { error: "Internal server error" },
                { status: 500 },
            );
        }

        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error("[contact] Unexpected error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
