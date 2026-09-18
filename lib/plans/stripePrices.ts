import "server-only";

import { PlanId, PlanStatus } from "@/types/planTypes";

const PRICE_IDS: Record<PlanId, string | undefined> = {
    basic: process.env.STRIPE_PRICE_BASIC,
    plus: process.env.STRIPE_PRICE_PLUS,
    professional: process.env.STRIPE_PRICE_PROFESSIONAL,
};

export const PLAN_RANK: Record<PlanId, number> = {
    basic: 0,
    plus: 1,
    professional: 2,
};

export const priceIdFor = (plan: PlanId): string => {
    const priceId = PRICE_IDS[plan];
    if (!priceId) throw new Error(`No Stripe price configured for ${plan}`);
    return priceId;
};

export const planForPriceId = (priceId: string): PlanId | null => {
    const entry = (Object.keys(PRICE_IDS) as PlanId[]).find(
        (plan) => PRICE_IDS[plan] === priceId,
    );
    return entry ?? null;
};

const PLAN_STATUSES: Record<string, PlanStatus> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    unpaid: "unpaid",
    incomplete: "unpaid",
    paused: "unpaid",
    canceled: "cancelled",
    incomplete_expired: "cancelled",
};

export const planStatusFor = (status: string): PlanStatus =>
    PLAN_STATUSES[status] ?? "unpaid";
