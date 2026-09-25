import "server-only";

import { reportError } from "@/lib/errorResponse";
import { parsePlanId } from "@/lib/plans/entitlements";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
    BillingClaim,
    BillingIntentKind,
    BillingIntentRow,
    BillingIntentStatus,
    PlanId,
} from "@/types/planTypes";

const CREATING_TTL_MS: Record<BillingIntentKind, number> = {
    checkout: 60 * 1000,
    switch: 120 * 1000,
};

const SELECTED =
    "user_id, kind, plan, intent_id, status, stripe_session_id, expires_at";

type RawIntent = {
    user_id: string;
    kind: string;
    plan: string;
    intent_id: string;
    status: string;
    stripe_session_id: string | null;
    expires_at: string;
};

const parseKind = (value: string): BillingIntentKind =>
    value === "switch" ? "switch" : "checkout";

const parseStatus = (value: string): BillingIntentStatus =>
    value === "open" ? "open" : "creating";

const mapIntent = (row: RawIntent): BillingIntentRow => ({
    userId: row.user_id,
    kind: parseKind(row.kind),
    plan: parsePlanId(row.plan) ?? "basic",
    intentId: row.intent_id,
    status: parseStatus(row.status),
    stripeSessionId: row.stripe_session_id,
    expiresAt: row.expires_at,
});

export const intentHasLapsed = (
    intent: BillingIntentRow,
    now: number = Date.now(),
): boolean => {
    const expiry = new Date(intent.expiresAt).getTime();
    return Number.isNaN(expiry) || expiry <= now;
};

const creatingExpiry = (now: number, kind: BillingIntentKind): string =>
    new Date(now + CREATING_TTL_MS[kind]).toISOString();

const readIntent = async (
    userId: string,
): Promise<BillingIntentRow | null> => {
    const { data, error } = await supabaseAdmin
        .from("billing_intents")
        .select(SELECTED)
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        await reportError("billing:intent", error, undefined, userId);
        throw new Error(
            `Could not read the billing intent for ${userId}: ${error.message}`,
        );
    }

    return data ? mapIntent(data as RawIntent) : null;
};

const reclaim = async (
    previous: BillingIntentRow,
    kind: BillingIntentKind,
    plan: PlanId,
    now: number,
): Promise<BillingIntentRow | null> => {
    const { data, error } = await supabaseAdmin
        .from("billing_intents")
        .update({
            kind,
            plan,
            intent_id: crypto.randomUUID(),
            status: "creating",
            stripe_session_id: null,
            expires_at: creatingExpiry(now, kind),
            updated_at: new Date(now).toISOString(),
        })
        .eq("user_id", previous.userId)
        .eq("intent_id", previous.intentId)
        .select(SELECTED);

    if (error) {
        await reportError(
            "billing:intent",
            error,
            undefined,
            previous.userId,
        );
        throw new Error(
            `Could not reclaim the billing intent for ${previous.userId}: ${error.message}`,
        );
    }

    const row = (data as RawIntent[] | null)?.[0];
    return row ? mapIntent(row) : null;
};

export const claimIntent = async (
    userId: string,
    kind: BillingIntentKind,
    plan: PlanId,
): Promise<BillingClaim> => {
    for (let attempt = 0; attempt < 2; attempt++) {
        const now = Date.now();

        const { data, error } = await supabaseAdmin
            .from("billing_intents")
            .upsert(
                {
                    user_id: userId,
                    kind,
                    plan,
                    intent_id: crypto.randomUUID(),
                    status: "creating",
                    stripe_session_id: null,
                    expires_at: creatingExpiry(now, kind),
                    updated_at: new Date(now).toISOString(),
                },
                { onConflict: "user_id", ignoreDuplicates: true },
            )
            .select(SELECTED);

        if (error) {
            await reportError("billing:intent", error, undefined, userId);
            throw new Error(
                `Could not claim a billing intent for ${userId}: ${error.message}`,
            );
        }

        const inserted = (data as RawIntent[] | null)?.[0];
        if (inserted) return { owned: true, intent: mapIntent(inserted) };

        const existing = await readIntent(userId);
        if (!existing) continue;

        if (!intentHasLapsed(existing, now)) {
            return { owned: false, intent: existing };
        }

        const reclaimed = await reclaim(existing, kind, plan, now);
        if (reclaimed) return { owned: true, intent: reclaimed };

        const winner = await readIntent(userId);
        if (winner) return { owned: false, intent: winner };
    }

    const stuck = new Error(
        `Could not settle the billing intent for ${userId}`,
    );
    await reportError("billing:intent", stuck, undefined, userId);
    throw stuck;
};

export const takeOverIntent = async (
    previous: BillingIntentRow,
    kind: BillingIntentKind,
    plan: PlanId,
): Promise<BillingIntentRow | null> => reclaim(previous, kind, plan, Date.now());

export const openIntent = async (
    intent: BillingIntentRow,
    sessionId: string,
    expiresAt: string,
): Promise<boolean> => {
    const { data, error } = await supabaseAdmin
        .from("billing_intents")
        .update({
            status: "open",
            stripe_session_id: sessionId,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
        })
        .eq("user_id", intent.userId)
        .eq("intent_id", intent.intentId)
        .select("user_id");

    if (error) {
        await reportError("billing:intent", error, undefined, intent.userId);
        throw new Error(
            `Could not open the billing intent for ${intent.userId}: ${error.message}`,
        );
    }

    return (data?.length ?? 0) > 0;
};

export const releaseIntent = async (
    intent: BillingIntentRow,
): Promise<void> => {
    const { error } = await supabaseAdmin
        .from("billing_intents")
        .delete()
        .eq("user_id", intent.userId)
        .eq("intent_id", intent.intentId);

    if (error) {
        await reportError("billing:intent", error, undefined, intent.userId);
    }
};

export const releaseIntentForSession = async (
    sessionId: string,
): Promise<void> => {
    const { error } = await supabaseAdmin
        .from("billing_intents")
        .delete()
        .eq("stripe_session_id", sessionId);

    if (error) {
        await reportError("billing:intent", error);
        throw new Error(
            `Could not release the billing intent for session ${sessionId}: ${error.message}`,
        );
    }
};
