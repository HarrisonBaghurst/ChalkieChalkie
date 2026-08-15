/**
 * Thin wrapper over the Vercel REST API for the staged-deployment workflow.
 *
 * The project has "Auto-assign Custom Production Domains" turned off (Project
 * Settings → Environments → Production → Branch Tracking), so a push to the
 * production branch builds a production deployment that serves no traffic and
 * sits in the `STAGED` substate. Promotion is what actually swaps the domains,
 * and it is deferred to the nightly cron in
 * `app/api/cron/promote-latest/route.ts`.
 */

const VERCEL_API = "https://api.vercel.com";

/** The branch whose staged builds are eligible for nightly promotion. */
export const PRODUCTION_BRANCH = "main";

/**
 * Subset of the list-deployments response we rely on. `readySubstate` is the
 * field that distinguishes a build nobody has seen (`STAGED`) from the one
 * currently serving the domains (`PROMOTED`).
 */
export type VercelDeployment = {
    uid: string;
    url: string;
    createdAt: number;
    readyState: string;
    readySubstate?: "PROMOTED" | "ROLLING" | "STAGED";
    target?: "production" | "staging" | null;
    meta?: Record<string, string>;
};

type VercelConfig = {
    token: string;
    projectId: string;
    teamId?: string;
};

/**
 * `VERCEL_PROJECT_ID` is a Vercel system environment variable, available at
 * runtime as long as "Enable access to System Environment Variables" is
 * checked. `VERCEL_TEAM_ID` is only needed when the project lives under a
 * team — on a personal (Hobby) account the token is already correctly scoped.
 */
function vercelConfig(): VercelConfig {
    const token = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;

    if (!token) throw new Error("VERCEL_TOKEN is not set");
    if (!projectId) throw new Error("VERCEL_PROJECT_ID is not set");

    return { token, projectId, teamId: process.env.VERCEL_TEAM_ID };
}

async function vercelFetch(
    path: string,
    params: Record<string, string>,
    init: RequestInit,
    config: VercelConfig,
): Promise<Response> {
    const url = new URL(path, VERCEL_API);
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }
    if (config.teamId) url.searchParams.set("teamId", config.teamId);

    return fetch(url, {
        ...init,
        headers: {
            ...init.headers,
            Authorization: `Bearer ${config.token}`,
        },
        cache: "no-store",
    });
}

/**
 * The newest successfully built production deployment of {@link
 * PRODUCTION_BRANCH} that has never served production traffic, or null when
 * there is nothing to promote (no pushes since the last promotion, or every
 * build since then failed).
 *
 * Vercel returns deployments newest-first, but the ordering isn't part of the
 * documented contract, so we sort rather than trust it.
 */
export async function findLatestStagedDeployment(): Promise<VercelDeployment | null> {
    const config = vercelConfig();

    const res = await vercelFetch(
        "/v7/deployments",
        {
            projectId: config.projectId,
            target: "production",
            state: "READY",
            branch: PRODUCTION_BRANCH,
            limit: "20",
        },
        { method: "GET" },
        config,
    );

    if (!res.ok) {
        throw new Error(
            `Vercel list-deployments failed (${res.status}): ${await res.text()}`,
        );
    }

    const { deployments } = (await res.json()) as {
        deployments: VercelDeployment[];
    };

    const staged = deployments.filter((d) => d.readySubstate === "STAGED");
    if (staged.length === 0) return null;

    return staged.reduce((newest, d) =>
        d.createdAt > newest.createdAt ? d : newest,
    );
}

/**
 * Point the production domains at an existing deployment. This is an alias
 * swap, not a rebuild — the deployment must already be built and READY, which
 * is guaranteed by the `state=READY` filter in
 * {@link findLatestStagedDeployment}.
 */
export async function promoteDeployment(deploymentId: string): Promise<void> {
    const config = vercelConfig();

    const res = await vercelFetch(
        `/v10/projects/${config.projectId}/promote/${deploymentId}`,
        {},
        { method: "POST" },
        config,
    );

    // 201 and 202 are both success; 202 means the swap is still propagating.
    if (res.status !== 201 && res.status !== 202) {
        throw new Error(
            `Vercel promote failed (${res.status}): ${await res.text()}`,
        );
    }
}
