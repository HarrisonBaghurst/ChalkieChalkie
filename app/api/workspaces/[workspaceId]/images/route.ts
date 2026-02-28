import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Upload pasted image to database
 *
 * @route api/workspaces/[workspaceId]/images
 */
export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const imageId = formData.get("imageId") as string;
    const workspaceId = formData.get("workspaceId") as string;

    // verfiy user is a member of the workspace
    const { data } = await supabaseAdmin
        .from("Room")
        .select("user_ids")
        .eq("id", workspaceId)
        .contains("user_ids", [userId])
        .single();

    if (!data || !data.user_ids) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // upload to supabase storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const path = `${workspaceId}/${imageId}`;

    const { error: uploadError } = await supabaseAdmin.storage
        .from("workspace-images")
        .upload(path, buffer, { contentType: file.type });

    if (uploadError) {
        return NextResponse.json(
            { error: uploadError.message },
            { status: 500 },
        );
    }

    // generate a signed url - valid for 7 days
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
        .from("workspace-images")
        .createSignedUrl(path, 60 * 60 * 24 * 7);

    if (signedError) {
        return NextResponse.json(
            { error: signedError.message },
            { status: 500 },
        );
    }

    return NextResponse.json({ url: signedData.signedUrl });
}

export async function DELETE(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "unauthorised" }, { status: 401 });
    }

    const { imageId, workspaceId } = await req.json();

    if (!imageId || !workspaceId) {
        return NextResponse.json(
            { error: "Missing ID or workspace" },
            { status: 400 },
        );
    }

    // verify user is a member of the workspace
    const { data } = await supabaseAdmin
        .from("Room")
        .select("user_ids")
        .eq("id", workspaceId)
        .contains("user_ids", [userId])
        .single();

    if (!data || !data.user_ids) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const path = `${workspaceId}/${imageId}`;

    const { error: deleteError } = await supabaseAdmin.storage
        .from("workspace-images")
        .remove([path]);

    if (deleteError) {
        return NextResponse.json(
            { error: deleteError.message },
            { status: 500 },
        );
    }

    return NextResponse.json({ success: true }, { status: 200 });
}
