import { supabaseAdmin } from "@/lib/supabase/admin";
import { DASHBOARD_GRACE_MS } from "@/lib/dashboardFilters";

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

    // Two queries, not one .or(): ISO dots collide with PostgREST's operator
    // separator and mis-parse silently.
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
