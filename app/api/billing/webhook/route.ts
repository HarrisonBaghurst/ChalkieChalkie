import { errorResponse, reportError } from "@/lib/errorResponse";
import { forgetCustomerId } from "@/lib/plans/billingCustomer";
import { releaseIntentForSession } from "@/lib/plans/billingIntent";
import { userIdForSubscription } from "@/lib/plans/planRow";
import {
    revokeDeletedCustomer,
    syncSubscription,
} from "@/lib/plans/syncSubscription";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

export const runtime = "nodejs";
export const maxDuration = 60;

const CLERK_USER_ID_REGEX = /^user_[a-zA-Z0-9]+$/;

const HANDLED = new Set([
    "checkout.session.completed",
    "checkout.session.expired",
    "checkout.session.async_payment_failed",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.payment_failed",
    "charge.refunded",
    "charge.dispute.created",
    "customer.deleted",
]);

const clerkId = (value: unknown): string | null =>
    typeof value === "string" && CLERK_USER_ID_REGEX.test(value) ? value : null;

const idOf = (value: string | { id: string } | null | undefined): string | null => {
    if (!value) return null;
    return typeof value === "string" ? value : value.id;
};

const applySubscription = async (
    subscription: Stripe.Subscription,
    eventCreated: number,
    hint?: string | null,
): Promise<void> => {
    const userId =
        clerkId(hint) ??
        clerkId(subscription.metadata?.clerk_user_id) ??
        (await userIdForSubscription(subscription.id));

    if (!userId) {
        await reportError(
            "billing:webhook",
            new Error(`No account matches subscription ${subscription.id}`),
        );
        return;
    }

    await syncSubscription(userId, subscription, undefined, eventCreated);
};

const applySubscriptionId = async (
    subscriptionId: string,
    eventCreated: number,
    hint?: string | null,
): Promise<void> => {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await applySubscription(subscription, eventCreated, hint);
};

type ChargeSubscription = {
    subscription: Stripe.Subscription;
    invoiceId: string;
};

const invoiceIdForCharge = async (
    charge: Stripe.Charge,
): Promise<string | null> => {
    const paymentIntentId = idOf(charge.payment_intent);
    if (!paymentIntentId) return null;

    const payments = await stripe.invoicePayments.list({
        payment: { type: "payment_intent", payment_intent: paymentIntentId },
        limit: 1,
    });

    return idOf(payments.data[0]?.invoice);
};

const subscriptionForCharge = async (
    charge: Stripe.Charge,
): Promise<ChargeSubscription | null> => {
    const invoiceId = await invoiceIdForCharge(charge);
    if (!invoiceId) return null;

    const invoice = await stripe.invoices.retrieve(invoiceId);
    const subscriptionId = idOf(
        invoice.parent?.subscription_details?.subscription,
    );
    if (!subscriptionId) return null;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return { subscription, invoiceId };
};

const revoke = async (subscription: Stripe.Subscription): Promise<void> => {
    if (subscription.status === "canceled") return;

    try {
        await stripe.subscriptions.cancel(subscription.id);
    } catch (error) {
        const live = await stripe.subscriptions.retrieve(subscription.id);
        if (live.status !== "canceled") throw error;
    }
};

const supersededInvoice = async (
    context: string,
    { subscription, invoiceId }: ChargeSubscription,
): Promise<boolean> => {
    if (idOf(subscription.latest_invoice) === invoiceId) return false;

    await reportError(
        context,
        new Error(
            `Invoice ${invoiceId} is not the latest on subscription ${subscription.id}; plan left alone`,
        ),
    );
    return true;
};

const handleRefund = async (charge: Stripe.Charge): Promise<void> => {
    if (charge.amount_captured <= 0) return;

    if (charge.amount_refunded < charge.amount_captured) {
        await reportError(
            "billing:refund",
            new Error(
                `Partial refund of ${charge.amount_refunded} of ${charge.amount_captured} on charge ${charge.id}; plan left alone`,
            ),
        );
        return;
    }

    const resolved = await subscriptionForCharge(charge);
    if (!resolved) return;

    if (await supersededInvoice("billing:refund", resolved)) return;

    await revoke(resolved.subscription);
};

const handleDispute = async (dispute: Stripe.Dispute): Promise<void> => {
    const chargeId = idOf(dispute.charge);
    if (!chargeId) return;

    const charge = await stripe.charges.retrieve(chargeId);
    const resolved = await subscriptionForCharge(charge);

    if (!resolved) return;

    if (await supersededInvoice("billing:dispute", resolved)) return;

    await reportError(
        "billing:dispute",
        new Error(
            `Dispute ${dispute.id} opened on subscription ${resolved.subscription.id}; cancelling`,
        ),
    );

    await revoke(resolved.subscription);
};

const handle = async (event: Stripe.Event): Promise<void> => {
    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object;
            const subscriptionId =
                session.mode === "subscription"
                    ? idOf(session.subscription)
                    : null;

            if (subscriptionId) {
                await applySubscriptionId(
                    subscriptionId,
                    event.created,
                    session.client_reference_id,
                );
            }

            await releaseIntentForSession(session.id);
            return;
        }
        case "checkout.session.expired":
        case "checkout.session.async_payment_failed": {
            await releaseIntentForSession(event.data.object.id);
            return;
        }
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
            await applySubscription(event.data.object, event.created);
            return;
        }
        case "invoice.payment_failed": {
            const parent = event.data.object.parent;
            const subscriptionId = idOf(
                parent?.subscription_details?.subscription,
            );
            if (!subscriptionId) return;

            await applySubscriptionId(subscriptionId, event.created);
            return;
        }
        case "charge.refunded": {
            await handleRefund(event.data.object);
            return;
        }
        case "charge.dispute.created": {
            await handleDispute(event.data.object);
            return;
        }
        case "customer.deleted": {
            const customerId = event.data.object.id;
            await revokeDeletedCustomer(customerId);
            await forgetCustomerId(customerId);
            return;
        }
    }
};

const SIGNATURE_REPORT_INTERVAL_MS = 10 * 60 * 1000;

let lastSignatureReport = 0;

const reportSignatureFailure = async (error: unknown): Promise<void> => {
    const now = Date.now();
    if (now - lastSignatureReport < SIGNATURE_REPORT_INTERVAL_MS) return;
    lastSignatureReport = now;

    await reportError("billing:webhook-signature", error, 400);
};

export async function POST(req: Request) {
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
        await reportSignatureFailure(
            new Error("Webhook request carried no stripe-signature header"),
        );
        return new Response("Invalid signature", { status: 400 });
    }

    const payload = await req.text();

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(
            payload,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!,
        );
    } catch (error) {
        await reportSignatureFailure(error);
        return new Response("Invalid signature", { status: 400 });
    }

    if (!HANDLED.has(event.type)) return Response.json({ received: true });

    try {
        await handle(event);
        return Response.json({ received: true });
    } catch (error) {
        return errorResponse("billing:webhook", error, 500);
    }
}
