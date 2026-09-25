import "server-only";

import { AccountLosses } from "@/types/settingsTypes";
import { DASHBOARD_GRACE_MS } from "@/lib/dashboardFilters";
import { markAccountDeleted } from "@/lib/deletedAccounts";
import { deleteWorkspaceResources } from "@/lib/deleteWorkspace";
import { reportError } from "@/lib/errorResponse";
import { readPlanRow } from "@/lib/plans/planRow";
import { evictRoomMembers } from "@/lib/realtimeAdmin";
import { invalidatePlanCache } from "@/lib/serverPlan";
import { isMissingResource, stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PlanRow } from "@/types/planTypes";
import { clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";

const LIVE_STRIPE_STATUSES = new Set<Stripe.Subscription.Status>([
    "active",
    "trialing",
    "past_due",
    "unpaid",
    "incomplete",
    "paused",
]);

const ROOM_BATCH = 10;

type HostedRoom = {
    id: string;
    start_time: string | null;
    user_ids: string[] | null;
};

type JoinedRoom = {
    id: string;
    user_ids: string[] | null;
};

const hostedRooms = async (userId: string): Promise<HostedRoom[]> => {
    const { data, error } = await supabaseAdmin
        .from("Room")
        .select("id, start_time, user_ids")
        .eq("host_id", userId);

    if (error) throw error;
    return (data ?? []) as HostedRoom[];
};

const joinedRooms = async (userId: string): Promise<JoinedRoom[]> => {
    const { data, error } = await supabaseAdmin
        .from("Room")
        .select("id, user_ids")
        .contains("user_ids", [userId])
        .neq("host_id", userId);

    if (error) throw error;
    return (data ?? []) as JoinedRoom[];
};

const countLinks = async (userId: string): Promise<number> => {
    const { count, error } = await supabaseAdmin
        .from("tutor_links")
        .select("id", { count: "exact", head: true })
        .or(`tutor_id.eq.${userId},student_id.eq.${userId}`);

    if (error) throw error;
    return count ?? 0;
};

const isUpcoming = (room: HostedRoom, cutoff: number): boolean => {
    if (!room.start_time) return true;
    const start = new Date(room.start_time).getTime();
    return Number.isNaN(start) || start >= cutoff;
};

export const accountLosses = async (userId: string): Promise<AccountLosses> => {
    const [hosted, joined, links] = await Promise.all([
        hostedRooms(userId),
        joinedRooms(userId),
        countLinks(userId),
    ]);

    const cutoff = Date.now() - DASHBOARD_GRACE_MS;
    const upcoming = hosted.filter((room) => isUpcoming(room, cutoff));

    const students = new Set<string>();
    for (const room of upcoming) {
        for (const id of room.user_ids ?? []) {
            if (id !== userId) students.add(id);
        }
    }

    return {
        hostedUpcoming: upcoming.length,
        hostedPast: hosted.length - upcoming.length,
        affectedStudents: students.size,
        links,
        joinedWorkspaces: joined.length,
    };
};

const customerIdsFor = async (
    userId: string,
    row: PlanRow | null,
): Promise<string[]> => {
    const ids = new Set<string>();
    if (row?.stripeCustomerId) ids.add(row.stripeCustomerId);

    const { data, error } = await supabaseAdmin
        .from("billing_customers")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) throw error;
    if (data?.stripe_customer_id) ids.add(data.stripe_customer_id);

    return [...ids];
};

const liveSubscriptions = async (
    customerIds: string[],
    namedId: string | null,
): Promise<Stripe.Subscription[]> => {
    const found = new Map<string, Stripe.Subscription>();

    for (const customer of customerIds) {
        try {
            const list = await stripe.subscriptions.list({
                customer,
                status: "all",
                limit: 100,
            });
            for (const subscription of list.data) {
                found.set(subscription.id, subscription);
            }
        } catch (error) {
            if (!isMissingResource(error)) throw error;
        }
    }

    if (namedId && !found.has(namedId)) {
        try {
            found.set(namedId, await stripe.subscriptions.retrieve(namedId));
        } catch (error) {
            if (!isMissingResource(error)) throw error;
        }
    }

    return [...found.values()].filter((subscription) =>
        LIVE_STRIPE_STATUSES.has(subscription.status),
    );
};

const cancelNow = async (
    subscription: Stripe.Subscription,
    intentId: string,
): Promise<void> => {
    try {
        await stripe.subscriptions.cancel(
            subscription.id,
            { prorate: false, invoice_now: false },
            { idempotencyKey: `${intentId}:delete:${subscription.id}` },
        );
    } catch (error) {
        const live = await stripe.subscriptions.retrieve(subscription.id);
        if (live.status !== "canceled") throw error;
    }
};

export const cancelAllSubscriptions = async (
    userId: string,
    intentId: string,
): Promise<void> => {
    const row = await readPlanRow(userId);
    const subscriptions = await liveSubscriptions(
        await customerIdsFor(userId, row),
        row?.stripeSubscriptionId ?? null,
    );

    for (const subscription of subscriptions) {
        await cancelNow(subscription, intentId);
    }
};

const deleteHostedRooms = async (userId: string): Promise<void> => {
    const rooms = await hostedRooms(userId);
    let failed = 0;

    for (let i = 0; i < rooms.length; i += ROOM_BATCH) {
        const results = await Promise.allSettled(
            rooms
                .slice(i, i + ROOM_BATCH)
                .map((room) => deleteWorkspaceResources(room.id)),
        );

        for (const result of results) {
            if (result.status === "rejected") {
                failed++;
                await reportError(
                    "account:delete-workspace",
                    result.reason,
                    undefined,
                    userId,
                );
            }
        }
    }

    if (failed > 0) {
        throw new Error(
            `${failed} of ${rooms.length} hosted workspaces could not be deleted for ${userId}`,
        );
    }
};

const leaveJoinedRooms = async (userId: string): Promise<void> => {
    const rooms = await joinedRooms(userId);

    for (const room of rooms) {
        const { error } = await supabaseAdmin
            .from("Room")
            .update({
                user_ids: (room.user_ids ?? []).filter((id) => id !== userId),
            })
            .eq("id", room.id);

        if (error) throw error;
    }

    await evictRoomMembers(
        rooms.map((room) => ({ roomId: room.id, userId })),
    );
};

const deleteRows = async (userId: string): Promise<void> => {
    const deletions = [
        supabaseAdmin
            .from("tutor_links")
            .delete()
            .or(`tutor_id.eq.${userId},student_id.eq.${userId}`),
        supabaseAdmin.from("link_invites").delete().eq("issuer_id", userId),
        supabaseAdmin.from("usage_counters").delete().eq("user_id", userId),
        supabaseAdmin.from("billing_intents").delete().eq("user_id", userId),
        supabaseAdmin.from("billing_customers").delete().eq("user_id", userId),
        supabaseAdmin.from("user_plans").delete().eq("user_id", userId),
    ];

    for (const deletion of deletions) {
        const { error } = await deletion;
        if (error) throw error;
    }

    await invalidatePlanCache(userId);
};

const deleteClerkUser = async (userId: string): Promise<void> => {
    try {
        const client = await clerkClient();
        await client.users.deleteUser(userId);
    } catch (error) {
        if ((error as { status?: number }).status === 404) return;
        throw error;
    }
};

export const deleteAccountData = async (userId: string): Promise<void> => {
    await markAccountDeleted(userId);
    await deleteHostedRooms(userId);
    await leaveJoinedRooms(userId);
    await deleteRows(userId);
    await deleteClerkUser(userId);
};
