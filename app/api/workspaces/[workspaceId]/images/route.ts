import { errorResponse } from "@/lib/errorResponse";
import {
    ALLOWED_IMAGE_STORAGE_TYPES,
    MAX_UPLOAD_BYTES,
} from "@/lib/imageLimits";
import { consumePdfLease } from "@/lib/pdfLease";
import { deleteImage, imageKey, putImage } from "@/lib/r2";
import { enforceRateLimit } from "@/lib/ratelimit";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { isSafeId, requireRoomMembership } from "./_shared";

// A header, not a form field, so the limiter below still decides before the
// body is parsed rather than after.
const LEASE_HEADER = "x-pdf-lease";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ workspaceId: string }> },
) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { workspaceId: urlWorkspaceId } = await params;
    if (!isSafeId(urlWorkspaceId)) {
        return NextResponse.json(
            { error: "Invalid workspaceId" },
            { status: 400 },
        );
    }

    // A PDF paid for all its pages up front, so a page holding a live lease
    // spends that instead of a token. Anything else — absent, malformed,
    // forged, exhausted — falls through to the per-image limiter, which is
    // exactly the behaviour a lone pasted image already gets.
    const leaseId = req.headers.get(LEASE_HEADER);
    const prepaid =
        isSafeId(leaseId) &&
        (await consumePdfLease(userId, urlWorkspaceId, leaseId));

    if (!prepaid) {
        const blocked = await enforceRateLimit(
            req,
            "workspace-image:upload",
            userId,
        );
        if (blocked) return blocked;
    }

    let formData: FormData;
    try {
        formData = await req.formData();
    } catch {
        return NextResponse.json(
            { error: "Invalid form data" },
            { status: 400 },
        );
    }

    const file = formData.get("file");
    const imageId = formData.get("imageId");
    const bodyWorkspaceId = formData.get("workspaceId");

    if (!isSafeId(imageId)) {
        return NextResponse.json({ error: "Invalid imageId" }, { status: 400 });
    }

    // The URL param is authoritative; a form workspaceId may only agree.
    if (
        bodyWorkspaceId !== null &&
        bodyWorkspaceId !== "" &&
        bodyWorkspaceId !== urlWorkspaceId
    ) {
        return NextResponse.json(
            { error: "workspaceId in body must match URL" },
            { status: 400 },
        );
    }

    if (!(file instanceof File)) {
        return NextResponse.json(
            { error: "File is required" },
            { status: 400 },
        );
    }

    if (!ALLOWED_IMAGE_STORAGE_TYPES.has(file.type)) {
        return NextResponse.json(
            { error: "Unsupported file type" },
            { status: 415 },
        );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const forbidden = await requireRoomMembership(urlWorkspaceId, userId);
    if (forbidden) return forbidden;

    try {
        await putImage(
            imageKey(urlWorkspaceId, imageId),
            Buffer.from(await file.arrayBuffer()),
            file.type,
        );
    } catch (err) {
        return errorResponse("workspace-image:upload", err, 500, {
            userId,
            publicMessage: "Failed to upload image",
        });
    }

    return NextResponse.json({
        url: `/api/workspaces/${urlWorkspaceId}/images/${imageId}`,
    });
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ workspaceId: string }> },
) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const blocked = await enforceRateLimit(
        req,
        "workspace-image:delete",
        userId,
    );
    if (blocked) return blocked;

    const { workspaceId: urlWorkspaceId } = await params;
    if (!isSafeId(urlWorkspaceId)) {
        return NextResponse.json(
            { error: "Invalid workspaceId" },
            { status: 400 },
        );
    }

    let body: { imageId?: unknown; workspaceId?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON body" },
            { status: 400 },
        );
    }

    const { imageId, workspaceId: bodyWorkspaceId } = body;

    if (!isSafeId(imageId)) {
        return NextResponse.json({ error: "Invalid imageId" }, { status: 400 });
    }

    if (
        bodyWorkspaceId !== undefined &&
        bodyWorkspaceId !== null &&
        bodyWorkspaceId !== urlWorkspaceId
    ) {
        return NextResponse.json(
            { error: "workspaceId in body must match URL" },
            { status: 400 },
        );
    }

    const forbidden = await requireRoomMembership(urlWorkspaceId, userId);
    if (forbidden) return forbidden;

    try {
        await deleteImage(imageKey(urlWorkspaceId, imageId));
    } catch (err) {
        return errorResponse("workspace-image:delete", err, 500, {
            userId,
            publicMessage: "Failed to delete image",
        });
    }

    return NextResponse.json({ success: true }, { status: 200 });
}
