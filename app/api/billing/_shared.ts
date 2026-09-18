import {
    parsePlanId,
    statusGrantsEntitlements,
} from "@/lib/plans/entitlements";
import { PlanId, PlanRow } from "@/types/planTypes";

export const billingDenial = (
    reason: string,
    message: string,
    extra?: Record<string, unknown>,
): Response =>
    Response.json({ error: message, reason, ...extra }, { status: 409 });

export const compedPlanDenial = (row: PlanRow | null): Response | null =>
    row?.plan &&
    row.status &&
    statusGrantsEntitlements(row.status) &&
    !row.stripeCustomerId
        ? billingDenial(
              "comped-plan",
              "This account's plan is set manually and cannot be changed here",
          )
        : null;

export const planFromBody = async (req: Request): Promise<PlanId | Response> => {
    let body: { plan?: unknown };

    try {
        body = (await req.json()) as { plan?: unknown };
    } catch {
        return new Response("Invalid JSON body", { status: 400 });
    }

    const plan = parsePlanId(body.plan);
    if (!plan) return new Response("Invalid plan", { status: 400 });

    return plan;
};
