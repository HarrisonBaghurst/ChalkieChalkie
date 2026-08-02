import { fetchUserProfiles } from "@/lib/clerkUsers";
import { errorResponse } from "@/lib/errorResponse";
import {
    counterpartyIdOf,
    countSharedWorkspaces,
    listLinksFor,
} from "@/lib/links";
import { enforceRateLimit } from "@/lib/ratelimit";
import { LinkSummary } from "@/types/linkTypes";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * List every tutor_links row the caller is a party to, joined with the
 * counterparty's Clerk profile and the number of workspaces shared with
 * them. No role guard — the query is scoped to the caller's own rows
 * regardless of their current Clerk role.
 *
 * @route GET /api/links
 */
export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new Response("Unauthorised", { status: 401 });

        const blocked = await enforceRateLimit(req, "links:list", userId);
        if (blocked) return blocked;

        const rows = await listLinksFor(userId);
        if (rows.length === 0) {
            return new NextResponse(JSON.stringify({ links: [] }), {
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "private, no-store",
                },
            });
        }

        const counterpartyIds = rows.map((r) => counterpartyIdOf(r, userId));

        const [profiles, counts] = await Promise.all([
            fetchUserProfiles(counterpartyIds),
            countSharedWorkspaces(userId, counterpartyIds),
        ]);

        const profileById = new Map(profiles.map((p) => [p.id, p]));

        const links: LinkSummary[] = rows
            .map((row): LinkSummary | null => {
                const counterpartyId = counterpartyIdOf(row, userId);
                const counterparty = profileById.get(counterpartyId);
                // Drop rows whose Clerk profile is missing (deleted account).
                if (!counterparty) return null;
                return {
                    linkId: row.id,
                    counterparty,
                    createdAt: row.created_at,
                    sharedWorkspaces: counts[counterpartyId] ?? 0,
                };
            })
            .filter((l): l is LinkSummary => l !== null);

        return new NextResponse(JSON.stringify({ links }), {
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "private, no-store",
            },
        });
    } catch (err) {
        return errorResponse("links:list", err, 500);
    }
}
