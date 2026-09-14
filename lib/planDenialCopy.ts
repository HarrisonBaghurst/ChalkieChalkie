export type DenialBody = {
    reason?: string;
    error?: string;
    limit?: number | null;
    used?: number;
    requested?: number;
    resetsAt?: string;
};

export type DenialCopy = {
    title: string;
    description: string;
};

const resetLabel = (resetsAt?: string): string => {
    if (!resetsAt) return "at the start of next month";
    const date = new Date(resetsAt);
    if (Number.isNaN(date.getTime())) return "at the start of next month";
    return `on ${date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
    })}`;
};

export const planDenialCopy = (body: DenialBody): DenialCopy | null => {
    switch (body.reason) {
        case "no-plan":
            return {
                title: "No active plan",
                description:
                    "This account does not have a plan that allows creating workspaces.",
            };
        case "quota": {
            const tally =
                typeof body.limit === "number"
                    ? ` (${body.limit} of ${body.limit})`
                    : "";
            return {
                title: "Monthly workspace limit reached",
                description: `You have used every workspace your plan allows this month${tally}. Your allowance resets ${resetLabel(body.resetsAt)}.`,
            };
        }
        case "members":
            return {
                title: "Too many people in this workspace",
                description:
                    typeof body.limit === "number"
                        ? `Your plan allows ${body.limit} people per workspace, including you.`
                        : "Your plan allows fewer people per workspace than this.",
            };
        case "linked-students":
            return {
                title: "Linked student limit reached",
                description:
                    typeof body.limit === "number"
                        ? `That tutor's plan allows ${body.limit} linked students.`
                        : "That tutor has as many linked students as their plan allows.",
            };
        default:
            return null;
    }
};

export const responseDenialCopy = async (
    res: Response,
): Promise<DenialCopy | null> => {
    if (res.status === 429) {
        const retry = Number(res.headers.get("Retry-After"));
        return {
            title: "Too many requests",
            description:
                Number.isFinite(retry) && retry > 0
                    ? `Wait ${retry} second${retry === 1 ? "" : "s"} before trying again.`
                    : "Wait a moment before trying again.",
        };
    }

    if (res.status !== 403) return null;

    try {
        return planDenialCopy((await res.json()) as DenialBody);
    } catch {
        return null;
    }
};
