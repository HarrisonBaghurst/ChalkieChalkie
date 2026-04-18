import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const contactEmail = process.env.CONTACT_EMAIL!;

interface ContactPayload {
    title: string;
    body: string;
}

export async function POST(req: NextRequest) {
    try {
        const payload = (await req.json()) as ContactPayload;
        const { title, body } = payload;

        if (!title || !body) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 },
            );
        }

        const { data, error } = await resend.emails.send({
            from: "Chalkie Chalkie <onboarding@resend.dev>",
            to: [contactEmail],
            subject: title,
            html: body,
        });

        if (error) {
            return NextResponse.json({ error }, { status: 500 });
        }

        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}
