import { errorResponse } from "@/lib/errorResponse";
import { imageKey, presignImage } from "@/lib/r2";
import { enforceRateLimit } from "@/lib/ratelimit";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { isSafeId, requireRoomMembership } from "../_shared";

const SIGNED_URL_TTL_SECONDS = 60;

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ workspaceId: string; imageId: string }> },
) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const blocked = await enforceRateLimit(
        req,
        "workspace-image:serve",
        userId,
    );
    if (blocked) return blocked;

    const { workspaceId, imageId } = await params;
    if (!isSafeId(workspaceId)) {
        return NextResponse.json(
            { error: "Invalid workspaceId" },
            { status: 400 },
        );
    }
    if (!isSafeId(imageId)) {
        return NextResponse.json({ error: "Invalid imageId" }, { status: 400 });
    }

    const forbidden = await requireRoomMembership(workspaceId, userId);
    if (forbidden) return forbidden;

    try {
        const signedUrl = await presignImage(
            imageKey(workspaceId, imageId),
            SIGNED_URL_TTL_SECONDS,
        );

        return new NextResponse(null, {
            status: 302,
            headers: { Location: signedUrl, "Cache-Control": "no-store" },
        });
    } catch (err) {
        return errorResponse("workspace-image:serve", err, 500, {
            userId,
            publicMessage: "Failed to load image",
        });
    }
}
