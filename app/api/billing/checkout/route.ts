import { errorResponse, reportError } from "@/lib/errorResponse";
import {
    customerFor,
    isMissingCustomer,
    replaceCustomer,
} from "@/lib/plans/billingCustomer";
import {
    claimIntent,
    openIntent,
    releaseIntent,
    takeOverIntent,
} from "@/lib/plans/billingIntent";
import { statusGrantsEntitlements } from "@/lib/plans/entitlements";
import { readPlanRow } from "@/lib/plans/planRow";
import { priceIdFor } from "@/lib/plans/stripePrices";
import { enforceRateLimit } from "@/lib/ratelimit";
import { absoluteUrl } from "@/lib/siteUrl";
import { stripe } from "@/lib/stripe";
import { BillingIntentRow, PlanId } from "@/types/planTypes";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { billingDenial, compedPlanDenial, planFromBody } from "../_shared";

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
    expires_at: nowSeconds() + SESSION_TTL_SECONDS,
    metadata: { plan },
    subscription_data: { metadata: { clerk_user_id: userId } },
    success_url: absoluteUrl("/dashboard?checkout=success"),
    cancel_url: absoluteUrl("/pricing?checkout=cancelled"),
});

const createSession = async (
    intent: BillingIntentRow,
): Promise<Stripe.Checkout.Session> => {
    const { userId, plan, intentId } = intent;

    try {
        return await stripe.checkout.sessions.create(
            sessionParams(userId, plan, await customerFor(userId)),
            { idempotencyKey: intentId },
        );
    } catch (error) {
        if (!isMissingCustomer(error)) throw error;

        return stripe.checkout.sessions.create(
            sessionParams(userId, plan, await replaceCustomer(userId)),
            { idempotencyKey: `${intentId}:recreated` },
        );
    }
};

const expireQuietly = async (sessionId: string): Promise<void> => {
    try {
        await stripe.checkout.sessions.expire(sessionId);
    } catch (error) {
        await reportError("billing:checkout", error);
    }
};

const pendingDenial = (): Response =>
    billingDenial(
        "checkout-pending",
        "A payment for this account is already going through",
    );

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorised", { status: 401 });

    const blocked = await enforceRateLimit(req, "billing:checkout", userId);
    if (blocked) return blocked;

    const plan = await planFromBody(req);
    if (plan instanceof Response) return plan;

    let owned: BillingIntentRow | null = null;

    try {
        const row = await readPlanRow(userId);

        const comped = compedPlanDenial(row);
        if (comped) return comped;

        if (
            row?.stripeSubscriptionId &&
            row.status &&
            statusGrantsEntitlements(row.status)
        ) {
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

            const taken = await takeOverIntent(existing, "checkout", plan);
            if (!taken) return pendingDenial();

            owned = taken;

            if (session.status === "open") await expireQuietly(session.id);
        }

        const session = await createSession(owned);

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
        if (owned) await releaseIntent(owned);
        return errorResponse("billing:checkout", error, 500, { userId });
    }
}
