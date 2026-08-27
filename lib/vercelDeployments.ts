const VERCEL_API = "https://api.vercel.com";

export const PRODUCTION_BRANCH = "main";

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

    // Newest-first ordering isn't part of Vercel's documented contract.
    return staged.reduce((newest, d) =>
        d.createdAt > newest.createdAt ? d : newest,
    );
}

export async function fetchLiveProductionDeployment(): Promise<{
    id: string;
    createdAt: number;
} | null> {
    const config = vercelConfig();

    const res = await vercelFetch(
        `/v9/projects/${config.projectId}`,
        {},
        { method: "GET" },
        config,
    );

    if (!res.ok) {
        throw new Error(
            `Vercel get-project failed (${res.status}): ${await res.text()}`,
        );
    }

    const project = (await res.json()) as {
        targets?: { production?: { id?: string; createdAt?: number } | null };
    };

    const live = project.targets?.production;
    if (!live?.id || typeof live.createdAt !== "number") return null;

    return { id: live.id, createdAt: live.createdAt };
}

export async function promoteDeployment(deploymentId: string): Promise<void> {
    const config = vercelConfig();

    const res = await vercelFetch(
        `/v10/projects/${config.projectId}/promote/${deploymentId}`,
        {},
        { method: "POST" },
        config,
    );

    // 202 is success too — the alias swap is still propagating.
    if (res.status !== 201 && res.status !== 202) {
        throw new Error(
            `Vercel promote failed (${res.status}): ${await res.text()}`,
        );
    }
}
