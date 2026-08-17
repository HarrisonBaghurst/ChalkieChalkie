import { supabaseAdmin } from "@/lib/supabase/admin";

// Awaited, not fire-and-forget: serverless kills the function once the
// response is returned, which would drop a pending background insert.
export async function reportError(
    scope: string,
    err: unknown,
    status?: number,
    userId?: string | null,
): Promise<void> {
    console.error(`[${scope}]`, err);

    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? (err.stack ?? null) : null;

    try {
        await supabaseAdmin.from("error_logs").insert({
            scope,
            message,
            stack,
            status: status ?? null,
            user_id: userId ?? null,
        });
    } catch (logErr) {
        // Logging must never break the request or recurse into reportError.
        console.error("[errorResponse] failed to persist error log:", logErr);
    }
}

type ErrorResponseOptions = {
    publicMessage?: string;
    userId?: string | null;
};

export async function errorResponse(
    scope: string,
    err: unknown,
    status = 500,
    options?: ErrorResponseOptions,
): Promise<Response> {
    await reportError(scope, err, status, options?.userId);
    return Response.json(
        { error: options?.publicMessage ?? "Internal server error" },
        { status },
    );
}
