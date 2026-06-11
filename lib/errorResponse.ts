import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Central error reporting.
 *
 * Logs to the console (preserving the prior `console.error` behaviour) and
 * persists a row to the `error_logs` table in Supabase so errors can be
 * monitored directly from the Supabase dashboard.
 *
 * Never throws: a failure to persist the log must not break the request that
 * triggered it, nor recurse back into reporting. It is `await`ed rather than
 * fire-and-forget because serverless runtimes terminate the function once the
 * response is returned, which would kill a pending background insert.
 */
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
    /** Public message returned to the client. Defaults to "Internal server error". */
    publicMessage?: string;
    /** Authenticated Clerk user id, stored on the log row for context. */
    userId?: string | null;
};

/**
 * Report an error and return a standardised JSON error response.
 *
 * Single chokepoint for API catch/error branches: every route returns
 * `Response.json({ error }, { status })` with a consistent shape, while the
 * error is logged and persisted via {@link reportError}.
 */
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
