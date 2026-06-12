import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { reportError } from "@/lib/errorResponse";

type KeyBy = "userId" | "ip";
type Duration = `${number} ${"s" | "m" | "h" | "d"}`;
type LimiterConfig = {
    keyBy: KeyBy;
    limit: number;
    window: Duration;
};

// ─── EDIT RATE LIMITS HERE ──────────────────────────────────────────
// Single source of truth. Adjust `keyBy`, `limit`, or `window` for any
// route and the change applies app-wide. Adding a new entry requires
// updating the RateLimitKey union and using it in the route handler.
export const RATE_LIMITS = {
    "liveblocks-auth:user":   { keyBy: "userId", limit: 30,  window: "1 m" },
    "liveblocks-auth:ip":     { keyBy: "ip",     limit: 100, window: "1 m" },
    "contact":                { keyBy: "ip",     limit: 3,   window: "1 h" },
    "cron":                   { keyBy: "ip",     limit: 5,   window: "1 m" },
    "workspace:get":          { keyBy: "userId", limit: 60,  window: "1 m" },
    "workspace:patch":        { keyBy: "userId", limit: 20,  window: "1 m" },
    "workspace:create":       { keyBy: "userId", limit: 3,   window: "1 m" },
    "workspace:delete":       { keyBy: "userId", limit: 10,  window: "1 m" },
    "workspace-image:upload": { keyBy: "userId", limit: 20,  window: "1 m" },
    "workspace-image:delete": { keyBy: "userId", limit: 30,  window: "1 m" },
    "users:friends":          { keyBy: "userId", limit: 30,  window: "1 m" },
    "users:workspaces":       { keyBy: "userId", limit: 60,  window: "1 m" },
    "users:batch":            { keyBy: "userId", limit: 30,  window: "1 m" },
} as const satisfies Record<string, LimiterConfig>;

export type RateLimitKey = keyof typeof RATE_LIMITS;
// ────────────────────────────────────────────────────────────────────

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const limiterCache = new Map<RateLimitKey, Ratelimit>();

function getLimiter(key: RateLimitKey): Ratelimit {
    const cached = limiterCache.get(key);
    if (cached) return cached;

    const cfg = RATE_LIMITS[key];
    const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(cfg.limit, cfg.window),
        prefix: `chalkie:rl:${key}`,
        analytics: false,
    });
    limiterCache.set(key, limiter);
    return limiter;
}

function getIp(req: Request): string {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();
    const xri = req.headers.get("x-real-ip");
    if (xri) return xri.trim();
    return "unknown";
}

/**
 * Enforce a rate limit. Returns null when the request is allowed,
 * or a 429 Response when blocked.
 *
 * For userId-keyed limits, pass the authenticated Clerk userId.
 * For ip-keyed limits, the userId argument is ignored.
 *
 * Fail-open: if Upstash is unreachable the request is allowed through, and
 * the outage is reported via reportError so silent failures are visible in
 * the error_logs table.
 */
export async function enforceRateLimit(
    req: Request,
    key: RateLimitKey,
    userId?: string | null,
): Promise<Response | null> {
    const cfg = RATE_LIMITS[key];
    const identifier =
        cfg.keyBy === "userId" ? (userId ?? "anon") : getIp(req);

    try {
        const { success, limit, remaining, reset } =
            await getLimiter(key).limit(identifier);

        if (success) return null;

        const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
        return new Response(
            JSON.stringify({ error: "Rate limit exceeded" }),
            {
                status: 429,
                headers: {
                    "Content-Type": "application/json",
                    "Retry-After": String(retryAfter),
                    "X-RateLimit-Limit": String(limit),
                    "X-RateLimit-Remaining": String(remaining),
                    "X-RateLimit-Reset": String(reset),
                },
            },
        );
    } catch (err) {
        // Upstash unreachable: fail open, but surface the outage in error_logs.
        await reportError(`ratelimit:upstash:${key}`, err);
        return null;
    }
}
