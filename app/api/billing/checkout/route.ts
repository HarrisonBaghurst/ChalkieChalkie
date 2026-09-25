import { isDeletedAccount } from "@/lib/deletedAccounts";
import { errorResponse, reportError } from "@/lib/errorResponse";
import { customerFor, replaceCustomer } from "@/lib/plans/billingCustomer";
import {
    claimIntent,
    openIntent,
    releaseIntent,
    takeOverIntent,
} from "@/lib/plans/billingIntent";
import { statusGrantsEntitlements } from "@/lib/plans/entitlements";
import { readPlanRow } from "@/lib/plans/planRow";
import { priceIdFor } from "@/lib/plans/stripePrices";
import { syncSubscription } from "@/lib/plans/syncSubscription";
import { enforceRateLimit } from "@/lib/ratelimit";
import { absoluteUrl } from "@/lib/siteUrl";
import { isMissingResource, stripe } from "@/lib/stripe";
import { BillingIntentRow, PlanId, PlanRow } from "@/types/planTypes";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { billingDenial, compedPlanDenial, planFromBody } from "../_shared";

export const maxDuration = 60;

const SESSION_TTL_SECONDS = 30 * 60;
const ROW_GRACE_MS = 5 * 60 * 1000;

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

const rowExpiry = (session: Stripe.Checkout.Session): string =>
    new Date((session.expires_at ?? nowSeconds()) * 1000 + ROW_GRACE_MS).toISOString();

const sessionParams = (
    userId: string,
    plan: PlanId,
    customer: string,
): Stripe.Checkout.SessionCreateParams => ({
    mode: "subscription",
    line_items: [{ price: priceIdFor(plan), quantity: 1 }],
    managed_payments: { enabled: true },
    client_reference_id: userId,
    customer,
    customer_update: { address: "auto", name: "auto" },
    expires_at: nowSeconds() + SESSION_TTL_SECONDS,
    metadata: { plan },
    subscription_data: { metadata: { clerk_user_id: userId } },
    success_url: absoluteUrl(`/checkout/success?plan=${plan}`),
    cancel_url: absoluteUrl("/pricing?checkout=cancelled"),
});

const createSession = async (
    intent: BillingIntentRow,
    customer: string,
): Promise<Stripe.Checkout.Session> =>
    stripe.checkout.sessions.create(
        sessionParams(intent.userId, intent.plan, customer),
        { idempotencyKey: intent.intentId },
    );

const expireQuietly = async (sessionId: string): Promise<boolean> => {
    try {
        await stripe.checkout.sessions.expire(sessionId);
        return true;
    } catch (error) {
        await reportError("billing:checkout", error);
        return false;
    }
};

const GRANTING_STRIPE_STATUSES = new Set<Stripe.Subscription.Status>([
    "active",
    "trialing",
    "past_due",
]);

const STRANDED_STRIPE_STATUSES = new Set<Stripe.Subscription.Status>([
    "unpaid",
    "incomplete",
    "paused",
]);

type CustomerSubscriptions = {
    customer: string;
    subscriptions: Stripe.Subscription[];
};

const subscriptionsOnCustomer = async (
    userId: string,
): Promise<CustomerSubscriptions> => {
    const customer = await customerFor(userId);

    try {
        const list = await stripe.subscriptions.list({
            customer,
            status: "all",
            limit: 100,
        });
        return { customer, subscriptions: list.data };
    } catch (error) {
        if (!isMissingResource(error)) throw error;
        return { customer: await replaceCustomer(userId), subscriptions: [] };
    }
};

const withNamedSubscription = async (
    resolved: CustomerSubscriptions,
    named: string | null,
): Promise<CustomerSubscriptions> => {
    if (!named) return resolved;
    if (resolved.subscriptions.some(({ id }) => id === named)) return resolved;

    try {
        return {
            customer: resolved.customer,
            subscriptions: [
                ...resolved.subscriptions,
                await stripe.subscriptions.retrieve(named),
            ],
        };
    } catch (error) {
        if (!isMissingResource(error)) throw error;
        return resolved;
    }
};

const cancelStranded = async (
    userId: string,
    subscription: Stripe.Subscription,
): Promise<void> => {
    await reportError(
        "billing:stranded-subscription",
        new Error(
            `Subscription ${subscription.id} is ${subscription.status} in Stripe but grants nothing locally; cancelling it before a second checkout`,
        ),
        undefined,
        userId,
    );

    try {
        await stripe.subscriptions.cancel(subscription.id);
    } catch (error) {
        if (!isMissingResource(error)) throw error;
    }
};

const adoptLiveSubscription = async (
    userId: string,
    subscription: Stripe.Subscription,
): Promise<void> => {
    try {
        await syncSubscription(userId, subscription);
    } catch (error) {
        await reportError("billing:checkout", error, undefined, userId);
    }
};

const stripeSubscriptionDenial = async (
    userId: string,
    subscriptions: Stripe.Subscription[],
): Promise<Response | null> => {
    const granting = subscriptions.filter(({ status }) =>
        GRANTING_STRIPE_STATUSES.has(status),
    );

    if (granting.length > 1) {
        await reportError(
            "billing:duplicate-subscription",
            new Error(
                `This account holds ${granting.length} live subscriptions in Stripe (${granting
                    .map(({ id }) => id)
                    .join(", ")}); refusing a further checkout`,
            ),
            undefined,
            userId,
        );
    }

    const live = granting[0];

    if (live) {
        await adoptLiveSubscription(userId, live);

        return billingDenial(
            "has-plan",
            "This account already has an active subscription",
        );
    }

    for (const subscription of subscriptions) {
        if (!STRANDED_STRIPE_STATUSES.has(subscription.status)) continue;
        await cancelStranded(userId, subscription);
    }

    return null;
};

const pendingDenial = (): Response =>
    billingDenial(
        "checkout-pending",
        "A payment for this account is already going through",
    );

const hasLivePlan = (row: PlanRow | null): boolean =>
    !!row?.stripeSubscriptionId &&
    !!row.status &&
    statusGrantsEntitlements(row.status);

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorised", { status: 401 });

    const blocked = await enforceRateLimit(req, "billing:checkout", userId);
    if (blocked) return blocked;

    const plan = await planFromBody(req);
    if (plan instanceof Response) return plan;

    let owned: BillingIntentRow | null = null;

    try {
        if (await isDeletedAccount(userId)) {
            return billingDenial(
                "account-deleted",
                "This account is being deleted",
            );
        }

        const row = await readPlanRow(userId);

        const comped = compedPlanDenial(row);
        if (comped) return comped;

        if (hasLivePlan(row)) {
            return billingDenial(
                "has-plan",
                "This account already has an active subscription",
            );
        }

        const claim = await claimIntent(userId, "checkout", plan);

        if (claim.owned) {
            owned = claim.intent;
        } else {
            const existing = claim.intent;

            if (existing.kind === "switch") {
                return billingDenial(
                    "change-in-progress",
                    "A plan change for this account is already going through",
                );
            }

            if (existing.status === "creating" || !existing.stripeSessionId) {
                return pendingDenial();
            }

            const session = await stripe.checkout.sessions.retrieve(
                existing.stripeSessionId,
            );

            if (session.status === "complete") return pendingDenial();

            if (
                session.status === "open" &&
                existing.plan === plan &&
                session.url
            ) {
                return Response.json({ url: session.url });
            }

            if (
                session.status === "open" &&
                !(await expireQuietly(session.id))
            ) {
                return pendingDenial();
            }

            const taken = await takeOverIntent(existing, "checkout", plan);
            if (!taken) return pendingDenial();

            owned = taken;
        }

        const { customer, subscriptions } = await withNamedSubscription(
            await subscriptionsOnCustomer(userId),
            row?.stripeSubscriptionId ?? null,
        );

        const denial = await stripeSubscriptionDenial(userId, subscriptions);
        if (denial) return denial;

        const session = await createSession(owned, customer);

        if (!session.url) {
            return errorResponse(
                "billing:checkout",
                new Error(`Checkout Session ${session.id} has no URL`),
                500,
                { userId },
            );
        }

        const held = await openIntent(owned, session.id, rowExpiry(session));

        if (!held) {
            await expireQuietly(session.id);
            return pendingDenial();
        }

        owned = null;

        return Response.json({ url: session.url });
    } catch (error) {
        return errorResponse("billing:checkout", error, 500, { userId });
    } finally {
        if (owned) await releaseIntent(owned);
    }
}
