import { supabaseAdmin } from "@/lib/supabase/admin";
import { DASHBOARD_GRACE_MS } from "@/lib/dashboardFilters";

/**
 * Strip a student from every future-dated room hosted by a given tutor, as
 * part of unlinking the two.
 *
 * Scope is host_id + membership, never "any room containing both": a room
 * hosted by a DIFFERENT tutor is that tutor's relationship to manage, not
 * this one's business. Scoping by host also guarantees a host can never be
 * stripped from their own room, which would 403 them out of it at
 * liveblocks-auth.
 *
 * "Future" includes start_time IS NULL, because DashboardClient buckets a
 * null-start_time room as Upcoming — leaving it untouched would leave the
 * removed party's room sitting in their Upcoming list, defeating the point of
 * the removal. The cutoff subtracts DASHBOARD_GRACE_MS so this agrees with
 * what the dashboard itself calls "upcoming".
 *
 * Liveblocks note: a student already connected to a room stripped here keeps
 * their access token and stays connected until it expires or the socket
 * drops — Liveblocks access tokens carry their grants inside the token and
 * there is no server-side revocation API. Their NEXT auth round-trip
 * (reload, reconnect, expiry) re-checks Room.user_ids via liveblocks-auth and
 * 403s them, and the board is already unreachable from their dashboard since
 * /api/users/workspaces filters on membership. This is an accepted gap, not
 * something to fix here; hard eviction would require liveblocks.deleteRoom,
 * which destroys the board for every participant, not just the removed one.
 *
 * Returns the number of rooms updated. Throws on the first write failure so
 * the caller's errorResponse catches it — the tutor_links row is deleted by
 * the caller only after this resolves, so a thrown error leaves the link
 * intact and the operation retryable.
 */
export async function stripStudentFromFutureRooms(
    tutorId: string,
    studentId: string,
): Promise<number> {
    const cutoff = new Date(Date.now() - DASHBOARD_GRACE_MS).toISOString();

    const scoped = () =>
        supabaseAdmin
            .from("Room")
            .select("id, user_ids")
            .eq("host_id", tutorId)
            .contains("user_ids", [studentId]);

    // Two queries rather than one .or(): an ISO timestamp contains dots, and
    // "." is PostgREST's operator separator inside an .or() filter string, so
    // an unquoted value there would silently mis-parse. Row counts here are
    // small, so the extra round-trip is not a real cost.
    const [scheduledRes, unscheduledRes] = await Promise.all([
        scoped().gte("start_time", cutoff),
        scoped().is("start_time", null),
    ]);

    if (scheduledRes.error) throw scheduledRes.error;
    if (unscheduledRes.error) throw unscheduledRes.error;

    const rooms = new Map<string, string[]>();
    for (const row of [
        ...(scheduledRes.data ?? []),
        ...(unscheduledRes.data ?? []),
    ]) {
        rooms.set(row.id, (row.user_ids ?? []) as string[]);
    }

    for (const [id, userIds] of rooms) {
        const filtered = userIds.filter((u) => u !== studentId);
        const { error } = await supabaseAdmin
            .from("Room")
            .update({ user_ids: filtered })
            .eq("id", id);
        if (error) throw error;
    }

    return rooms.size;
}
