import "server-only";

import { reportError } from "@/lib/errorResponse";
import {
    RETENTION_FLOOR_MS,
    entitlementsFor,
    statusGrantsEntitlements,
} from "@/lib/plans/entitlements";
import { getUserPlan } from "@/lib/serverPlan";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
    PlanEntitlements,
    PlanId,
    ReconcileSummary,
} from "@/types/planTypes";

type HostedRoom = {
    id: string;
    start_time: string | null;
    opens_at: string | null;
    expires_at: string | null;
    opened_at: string | null;
    user_ids: string[] | null;
};

type LinkRow = {
    id: string;
    created_at: string;
    deactivated_at: string | null;
};

const parseInstant = (iso: string | null): number | null => {
    if (!iso) return null;
    const time = new Date(iso).getTime();
    return Number.isNaN(time) ? null : time;
};

export const nextExpiry = (
    start: number,
    existing: number | null,
    retentionMs: number,
    now: number,
): number => {
    const target = start + retentionMs;
    if (existing === null || target >= existing) return target;
    return Math.max(target, Math.min(existing, now + RETENTION_FLOOR_MS));
};

type RoomChange = {
    id: string;
    opens_at?: string;
    expires_at?: string;
};

const roomChange = (
    room: HostedRoom,
    entitlements: PlanEntitlements | null,
    now: number,
): RoomChange | null => {
    const start = parseInstant(room.start_time);
    if (start === null) return null;

    const change: RoomChange = { id: room.id };

    const existing = parseInstant(room.expires_at);
    const expiry = nextExpiry(
        start,
        existing,
        entitlements?.retentionMs ?? 0,
        now,
    );
    if (expiry !== existing) {
        change.expires_at = new Date(expiry).toISOString();
    }

    if (entitlements && !room.opened_at) {
        const opens = new Date(start - entitlements.leadMs).toISOString();
        if (opens !== room.opens_at) change.opens_at = opens;
    }

    return change.expires_at || change.opens_at ? change : null;
};

const reconcileRooms = async (
    userId: string,
    entitlements: PlanEntitlements | null,
    now: number,
): Promise<{ rewindowed: number; overCap: string[] }> => {
    const { data, error } = await supabaseAdmin
        .from("Room")
        .select("id, start_time, opens_at, expires_at, opened_at, user_ids")
        .eq("host_id", userId)
        .gt("expires_at", new Date(now).toISOString());

    if (error) {
        await reportError("plan:reconcile:rooms", error, undefined, userId);
        return { rewindowed: 0, overCap: [] };
    }

    const rooms = (data ?? []) as HostedRoom[];

    const changes = rooms
        .map((room) => roomChange(room, entitlements, now))
        .filter((change): change is RoomChange => change !== null);

    let rewindowed = 0;

    for (const { id, ...fields } of changes) {
        const { error: updateError } = await supabaseAdmin
            .from("Room")
            .update(fields)
            .eq("id", id);

        if (updateError) {
            await reportError(
                "plan:reconcile:rooms",
                updateError,
                undefined,
                userId,
            );
            continue;
        }
        rewindowed++;
    }

    const cap = entitlements?.maxWorkspaceMembers;
    const overCap = cap
        ? rooms
              .filter((room) => (room.user_ids ?? []).length > cap)
              .map((room) => room.id)
        : [];

    return { rewindowed, overCap };
};

const reconcileLinks = async (
    userId: string,
    entitlements: PlanEntitlements | null,
    now: number,
): Promise<{ deactivated: number; reactivated: number }> => {
    const { data, error } = await supabaseAdmin
        .from("tutor_links")
        .select("id, created_at, deactivated_at")
        .eq("tutor_id", userId)
        .order("created_at", { ascending: true });

    if (error) {
        await reportError("plan:reconcile:links", error, undefined, userId);
        return { deactivated: 0, reactivated: 0 };
    }

    const links = (data ?? []) as LinkRow[];
    const cap = entitlements ? entitlements.maxLinkedStudents : 0;

    const active = links.filter((link) => !link.deactivated_at);
    const inactive = links.filter((link) => link.deactivated_at);

    let toDeactivate: LinkRow[] = [];
    let toReactivate: LinkRow[] = [];

    if (cap === null) {
        toReactivate = inactive;
    } else if (active.length > cap) {
        toDeactivate = active.slice(cap);
    } else {
        toReactivate = inactive.slice(0, cap - active.length);
    }

    if (toDeactivate.length > 0) {
        const { error: deactivateError } = await supabaseAdmin
            .from("tutor_links")
            .update({ deactivated_at: new Date(now).toISOString() })
            .in(
                "id",
                toDeactivate.map((link) => link.id),
            );

        if (deactivateError) {
            await reportError(
                "plan:reconcile:links",
                deactivateError,
                undefined,
                userId,
            );
            return { deactivated: 0, reactivated: 0 };
        }
    }

    if (toReactivate.length > 0) {
        const { error: reactivateError } = await supabaseAdmin
            .from("tutor_links")
            .update({ deactivated_at: null })
            .in(
                "id",
                toReactivate.map((link) => link.id),
            );

        if (reactivateError) {
            await reportError(
                "plan:reconcile:links",
                reactivateError,
                undefined,
                userId,
            );
            return { deactivated: toDeactivate.length, reactivated: 0 };
        }
    }

    return {
        deactivated: toDeactivate.length,
        reactivated: toReactivate.length,
    };
};

export const reconcilePlanChange = async (
    userId: string,
    now: number = Date.now(),
): Promise<ReconcileSummary> => {
    const userPlan = await getUserPlan(userId);
    const granted =
        userPlan && statusGrantsEntitlements(userPlan.status)
            ? userPlan.plan
            : null;
    const entitlements: PlanEntitlements | null = granted
        ? entitlementsFor(granted)
        : null;

    const [rooms, links] = await Promise.all([
        reconcileRooms(userId, entitlements, now),
        reconcileLinks(userId, entitlements, now),
    ]);

    return {
        userId,
        plan: granted as PlanId | null,
        roomsRewindowed: rooms.rewindowed,
        linksDeactivated: links.deactivated,
        linksReactivated: links.reactivated,
        roomsOverCap: rooms.overCap,
    };
};
