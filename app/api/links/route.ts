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

// No role guard: the query is scoped to the caller's own rows.
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
                if (!counterparty) return null; // deleted account
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
