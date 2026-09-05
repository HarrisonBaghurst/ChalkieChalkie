import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const ID_MAX_LENGTH = 64;

export function isSafeId(value: unknown): value is string {
    return (
        typeof value === "string" &&
        value.length > 0 &&
        value.length <= ID_MAX_LENGTH &&
        SAFE_ID_REGEX.test(value)
    );
}

export async function requireRoomMembership(
    workspaceId: string,
    userId: string,
): Promise<Response | null> {
    const { data } = await supabaseAdmin
        .from("Room")
        .select("user_ids")
        .eq("id", workspaceId)
        .contains("user_ids", [userId])
        .single();

    if (!data || !data.user_ids) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return null;
}
