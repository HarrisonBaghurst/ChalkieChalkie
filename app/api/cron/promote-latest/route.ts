import { errorResponse } from "@/lib/errorResponse";
import { enforceRateLimit } from "@/lib/ratelimit";
import {
    findLatestStagedDeployment,
    promoteDeployment,
} from "@/lib/vercelDeployments";

export const runtime = "nodejs";

/**
 * Promote the newest staged production build to live.
 *
 * Deployments are built on every push but never auto-assigned the production
 * domains (see `lib/vercelDeployments.ts`), so this is the only thing that puts
 * new code in front of users — deliberately overnight, so a mid-lesson push
 * can't interrupt anyone.
 *
 * Scheduled `0 0 * * *`, which is UTC: that is local midnight over winter and
 * 1am over British Summer Time. Hobby-plan crons are also only accurate to
 * within the hour, so the real window is roughly 00:00–02:00 local. All of it
 * is well outside tutoring hours, which is the only thing that matters here.
 *
 * Note this runs on the *currently live* deployment, which is by definition the
 * one before the change being promoted. Edits to this route therefore only take
 * effect the night after the night they go live.
 *
 * @route /api/cron/promote-latest
 */
export async function GET(request: Request) {
    // verify caller is Vercel cron (auto-injects this header when CRON_SECRET is set)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response("Unauthorised", { status: 401 });
    }

    // defense-in-depth rate limit after auth so unauth traffic doesn't hit Upstash
    const blocked = await enforceRateLimit(request, "cron");
    if (blocked) return blocked;

    try {
        const deployment = await findLatestStagedDeployment();

        if (!deployment) {
            return Response.json({
                promoted: null,
                skipped: "no-staged-deployment",
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
