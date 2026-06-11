import { errorResponse } from "@/lib/errorResponse";
import { enforceRateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// alphanumeric, dash, underscore — matches UUIDs and crypto.randomUUID output
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const ID_MAX_LENGTH = 64;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
]);
// TODO: this signed URL is stored permanently in Liveblocks meta, but rooms
// that stay *active* past 14 days outlive it and show broken images (the cron
// only deletes inactive rooms). Store the storage path in the meta instead
// and resolve/refresh signed URLs client-side at load time.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days, matches room TTL

function isSafeId(value: unknown): value is string {
    return (
        typeof value === "string" &&
        value.length > 0 &&
        value.length <= ID_MAX_LENGTH &&
        SAFE_ID_REGEX.test(value)
    );
}

/**
 * Upload pasted image to database
 *
 * @route api/workspaces/[workspaceId]/images
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ workspaceId: string }> },
) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const blocked = await enforceRateLimit(req, "workspace-image:upload", userId);
    if (blocked) return blocked;

    const { workspaceId: urlWorkspaceId } = await params;
    if (!isSafeId(urlWorkspaceId)) {
        return NextResponse.json(
            { error: "Invalid workspaceId" },
            { status: 400 },
        );
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
        return NextResponse.json(
            { error: "Invalid imageId" },
            { status: 400 },
        );
    }

    // if the client sent a workspaceId in the form, it must match the URL
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

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
            { error: "Unsupported file type" },
            { status: 415 },
        );
    }

    if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
            { error: "File too large" },
            { status: 413 },
        );
    }

    // verify user is a member of the workspace
    const { data } = await supabaseAdmin
        .from("Room")
        .select("user_ids")
        .eq("id", urlWorkspaceId)
        .contains("user_ids", [userId])
        .single();

    if (!data || !data.user_ids) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // upload to supabase storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const path = `${urlWorkspaceId}/${imageId}`;

    const { error: uploadError } = await supabaseAdmin.storage
        .from("workspace-images")
        .upload(path, buffer, { contentType: file.type });

    if (uploadError) {
        return errorResponse("workspace-image:upload", uploadError, 500, {
            userId,
            publicMessage: "Failed to upload image",
        });
    }

    const { data: signedData, error: signedError } = await supabaseAdmin.storage
        .from("workspace-images")
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

    if (signedError) {
        return errorResponse("workspace-image:sign", signedError, 500, {
            userId,
            publicMessage: "Failed to sign image url",
        });
    }

    return NextResponse.json({ url: signedData.signedUrl });
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ workspaceId: string }> },
) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const blocked = await enforceRateLimit(req, "workspace-image:delete", userId);
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
        return NextResponse.json(
            { error: "Invalid imageId" },
            { status: 400 },
        );
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

    // verify user is a member of the workspace
    const { data } = await supabaseAdmin
        .from("Room")
        .select("user_ids")
        .eq("id", urlWorkspaceId)
        .contains("user_ids", [userId])
        .single();

    if (!data || !data.user_ids) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const path = `${urlWorkspaceId}/${imageId}`;

    const { error: deleteError } = await supabaseAdmin.storage
        .from("workspace-images")
        .remove([path]);

    if (deleteError) {
        return errorResponse("workspace-image:delete", deleteError, 500, {
            userId,
            publicMessage: "Failed to delete image",
        });
    }

    return NextResponse.json({ success: true }, { status: 200 });
}
