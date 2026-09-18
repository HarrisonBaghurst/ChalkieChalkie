import "server-only";

import { reportError } from "@/lib/errorResponse";
import { readPlanRow } from "@/lib/plans/planRow";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

const storedCustomer = async (userId: string): Promise<string | null> => {
    const { data, error } = await supabaseAdmin
        .from("billing_customers")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        await reportError("billing:customer", error, undefined, userId);
        throw new Error(
            `Could not read the billing customer for ${userId}: ${error.message}`,
        );
    }

    return data?.stripe_customer_id ?? null;
};

const record = async (
    userId: string,
    customerId: string,
): Promise<string> => {
    const { data, error } = await supabaseAdmin
        .from("billing_customers")
        .upsert(
            { user_id: userId, stripe_customer_id: customerId },
            { onConflict: "user_id", ignoreDuplicates: true },
        )
        .select("stripe_customer_id");

    if (error) {
        await reportError("billing:customer", error, undefined, userId);
        throw new Error(
            `Could not record the billing customer for ${userId}: ${error.message}`,
        );
    }

    const inserted = data?.[0]?.stripe_customer_id;
    if (inserted) return inserted;

    const winner = await storedCustomer(userId);

    if (!winner) {
        const missing = new Error(
            `Recorded no billing customer for ${userId} and found none`,
        );
        await reportError("billing:customer", missing, undefined, userId);
        throw missing;
    }

    return winner;
};

export const forgetCustomer = async (userId: string): Promise<void> => {
    const { error } = await supabaseAdmin
        .from("billing_customers")
        .delete()
        .eq("user_id", userId);

    if (error) {
        await reportError("billing:customer", error, undefined, userId);
        throw new Error(
            `Could not forget the billing customer for ${userId}: ${error.message}`,
        );
    }
};

export const forgetCustomerId = async (customerId: string): Promise<void> => {
    const { error } = await supabaseAdmin
        .from("billing_customers")
        .delete()
        .eq("stripe_customer_id", customerId);

    if (error) {
        await reportError("billing:customer", error);
        throw new Error(
            `Could not forget the billing customer ${customerId}: ${error.message}`,
        );
    }
};

export const customerFor = async (userId: string): Promise<string> => {
    const stored = await storedCustomer(userId);
    if (stored) return stored;

    const adopted = (await readPlanRow(userId))?.stripeCustomerId;
    if (adopted) return record(userId, adopted);

    const customer = await stripe.customers.create(
        { metadata: { clerk_user_id: userId } },
        { idempotencyKey: `customer:${userId}` },
    );

    return record(userId, customer.id);
};

export const replaceCustomer = async (userId: string): Promise<string> => {
    await forgetCustomer(userId);

    const customer = await stripe.customers.create({
        metadata: { clerk_user_id: userId },
    });

    return record(userId, customer.id);
};

export const isMissingCustomer = (error: unknown): boolean =>
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "resource_missing";
