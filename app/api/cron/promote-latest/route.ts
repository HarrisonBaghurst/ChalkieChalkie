import { errorResponse } from "@/lib/errorResponse";
import { enforceRateLimit } from "@/lib/ratelimit";
import {
    fetchLiveProductionDeployment,
    findLatestStagedDeployment,
    promoteDeployment,
} from "@/lib/vercelDeployments";

export const runtime = "nodejs";

// Runs on the currently live deployment, so edits here take effect the night
// after the night they go live.
export async function GET(request: Request) {
    // Vercel cron injects this header whenever CRON_SECRET is set.
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response("Unauthorised", { status: 401 });
    }

    // After auth, so unauthenticated traffic never reaches Upstash.
    const blocked = await enforceRateLimit(request, "cron");
    if (blocked) return blocked;

    try {
        const [deployment, live] = await Promise.all([
            findLatestStagedDeployment(),
            fetchLiveProductionDeployment(),
        ]);

        if (!deployment) {
            return Response.json({
                promoted: null,
                skipped: "no-staged-deployment",
            });
        }

        if (live && deployment.createdAt <= live.createdAt) {
            return Response.json({
                promoted: null,
                skipped: "no-newer-deployment",
                live: live.id,
            });
        }

        await promoteDeployment(deployment.uid);

        return Response.json({
            promoted: deployment.uid,
            url: deployment.url,
            sha: deployment.meta?.githubCommitSha ?? null,
            createdAt: deployment.createdAt,
        });
    } catch (err) {
        return await errorResponse("cron:promote-latest", err, 500, {
            publicMessage: "Failed to promote latest deployment",
        });
    }
}
