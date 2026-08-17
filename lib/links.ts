import { supabaseAdmin } from "@/lib/supabase/admin";
import { TutorLinkRow } from "@/types/linkTypes";

export async function listLinksFor(userId: string): Promise<TutorLinkRow[]> {
    // Safe to interpolate: Clerk ids carry no PostgREST reserved characters.
    const { data, error } = await supabaseAdmin
        .from("tutor_links")
        .select("*")
        .or(`tutor_id.eq.${userId},student_id.eq.${userId}`)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
}

export const counterpartyIdOf = (row: TutorLinkRow, userId: string): string =>
    row.tutor_id === userId ? row.student_id : row.tutor_id;

export async function countSharedWorkspaces(
    userId: string,
    counterpartyIds: string[],
): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    if (counterpartyIds.length === 0) return counts;

    const { data, error } = await supabaseAdmin
        .from("Room")
        .select("user_ids")
        .contains("user_ids", [userId]);

    if (error) throw error;

    const wanted = new Set(counterpartyIds);
    for (const room of data ?? []) {
        const ids = (room.user_ids ?? []) as string[];
        for (const id of ids) {
            if (wanted.has(id)) counts[id] = (counts[id] ?? 0) + 1;
        }
    }
    return counts;
}
