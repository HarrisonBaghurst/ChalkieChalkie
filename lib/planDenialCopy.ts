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

export const resetLabel = (resetsAt?: string): string => {
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
                    "This account does not have a plan that allows creating or managing workspaces.",
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
        case "start-time-opened":
            return {
                title: "Start time locked",
                description:
                    "This workspace has been opened, so its start time can no longer be changed.",
            };
        case "start-time-started":
            return {
                title: "Start time locked",
                description:
                    "This lesson's start time has passed, so it can no longer be changed.",
            };
        case "has-plan":
            return {
                title: "You already have a plan",
                description:
                    "Change the plan you are on rather than buying a second one.",
            };
        case "checkout-pending":
            return {
                title: "Payment already going through",
                description:
                    "You have just paid for a plan and Stripe is still confirming it. Give it a few seconds, then reload the page.",
            };
        case "change-in-progress":
            return {
                title: "Plan change already going through",
                description:
                    "A change to this account's plan is still being processed. Give it a few seconds, then try again.",
            };
        case "no-subscription":
            return {
                title: "No subscription to change",
                description:
                    "Choose a plan first, then you can move between them whenever you like.",
            };
        case "comped-plan":
            return {
                title: "Plan set manually",
                description:
                    "This account's plan was granted directly and is not billed through Stripe, so it cannot be changed here.",
            };
        case "no-pending-change":
            return {
                title: "Nothing scheduled",
                description:
                    "There is no upcoming plan change on this account to cancel.",
            };
        case "same-plan":
            return {
                title: "Already on this plan",
                description: "Pick a different plan to change to.",
            };
        case "past-due":
            return {
                title: "Your last payment did not go through",
                description:
                    "Update your card using the link in your Stripe receipt email. Once the payment clears you can change your plan again — you keep everything your plan allows in the meantime.",
            };
        case "cancelling":
            return {
                title: "Your plan is already set to end",
                description:
                    "Keep your current plan first, then you can move between tiers again. Upgrading now also works: it starts a new billing period today and cancels the ending.",
            };
        case "already-cancelling":
            return {
                title: "Your plan is already set to end",
                description:
                    "Use Keep plan in Settings if you want to carry on.",
            };
        case "account-deleted":
            return {
                title: "This account is being deleted",
                description:
                    "Finish deleting it from Settings. A deleted account cannot buy a plan.",
            };
        case "confirmation":
            return {
                title: "Confirmation did not match",
                description:
                    "Type the phrase exactly as shown to delete your account.",
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

    if (res.status !== 403 && res.status !== 409) return null;

    try {
        return planDenialCopy((await res.json()) as DenialBody);
    } catch {
        return null;
    }
};
