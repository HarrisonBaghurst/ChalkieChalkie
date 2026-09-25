import "server-only";

import { reportError } from "@/lib/errorResponse";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const isDeletedAccount = async (userId: string): Promise<boolean> => {
    const { data, error } = await supabaseAdmin
        .from("deleted_accounts")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        await reportError("account:tombstone", error, undefined, userId);
        throw new Error(
            `Could not read the deletion tombstone for ${userId}: ${error.message}`,
        );
    }

    return !!data;
};

export const markAccountDeleted = async (userId: string): Promise<void> => {
    const { error } = await supabaseAdmin
        .from("deleted_accounts")
        .upsert(
            { user_id: userId },
            { onConflict: "user_id", ignoreDuplicates: true },
        );

    if (error) {
        await reportError("account:tombstone", error, undefined, userId);
        throw new Error(
            `Could not write the deletion tombstone for ${userId}: ${error.message}`,
        );
    }
};
