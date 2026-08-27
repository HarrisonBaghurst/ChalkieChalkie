import { errorResponse } from "@/lib/errorResponse";
import { MAX_PDF_PAGES } from "@/lib/imageLimits";
import { createPdfLease } from "@/lib/pdfLease";
import { enforceRateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const ID_MAX_LENGTH = 64;

function isSafeId(value: unknown): value is string {
    return (
        typeof value === "string" &&
        value.length > 0 &&
        value.length <= ID_MAX_LENGTH &&
        SAFE_ID_REGEX.test(value)
    );
}

// Charges a whole PDF's worth of tokens in one decision and hands back a lease
// the page uploads spend instead. Whoever calls this learns they are over
// budget before a single page has been rendered, so a refusal never strands
// half a document on the canvas.
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ workspaceId: string }> },
) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { workspaceId } = await params;
    if (!isSafeId(workspaceId)) {
        return NextResponse.json(
            { error: "Invalid workspaceId" },
            { status: 400 },
        );
    }

    let pageCount: unknown;
    try {
        ({ pageCount } = await req.json());
    } catch {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    if (
        typeof pageCount !== "number" ||
        !Number.isInteger(pageCount) ||
        pageCount < 1 ||
        pageCount > MAX_PDF_PAGES
    ) {
        return NextResponse.json(
            { error: `pageCount must be 1-${MAX_PDF_PAGES}` },
            { status: 400 },
        );
    }

    const { data } = await supabaseAdmin
        .from("Room")
        .select("user_ids")
        .eq("id", workspaceId)
        .contains("user_ids", [userId])
        .single();

    if (!data || !data.user_ids) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Membership first: a non-member should not be able to burn someone's
    // budget by reserving against a room they cannot upload to anyway.
    const blocked = await enforceRateLimit(
        req,
        "workspace-pdf:upload",
        userId,
        pageCount,
    );
    if (blocked) return blocked;

    try {
        const leaseId = await createPdfLease(userId, workspaceId, pageCount);
        return NextResponse.json({ leaseId });
    } catch (err) {
        return errorResponse("workspace-pdf:reserve", err, 500, {
            userId,
            publicMessage: "Failed to start PDF upload",
        });
    }
}
