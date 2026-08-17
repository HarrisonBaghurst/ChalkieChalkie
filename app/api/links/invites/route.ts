import { errorResponse } from "@/lib/errorResponse";
import {
    INVITE_CODE_TTL_MS,
    generateInviteCode,
} from "@/lib/inviteCode";
import { enforceRateLimit } from "@/lib/ratelimit";
import { requireLinkRole } from "@/lib/serverRole";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const MAX_GENERATE_ATTEMPTS = 5;

// Revoking first is what enforces one live code per issuer; the partial unique
// index is only a backstop against concurrent requests.
export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new Response("Unauthorised", { status: 401 });

        const blocked = await enforceRateLimit(req, "links:generate", userId);
        if (blocked) return blocked;

        const role = await requireLinkRole(userId);
        if (role instanceof Response) return role;

        const { error: revokeError } = await supabaseAdmin
            .from("link_invites")
            .update({ revoked_at: new Date().toISOString() })
            .eq("issuer_id", userId)
            .is("consumed_at", null)
            .is("revoked_at", null);

        if (revokeError) {
            return errorResponse("links:generate", revokeError, 500, {
                userId,
            });
        }

        const expiresAt = new Date(Date.now() + INVITE_CODE_TTL_MS).toISOString();

        for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt++) {
            const code = generateInviteCode();
            const { data, error } = await supabaseAdmin
                .from("link_invites")
                .insert({
                    code,
                    issuer_id: userId,
                    issuer_role: role,
                    expires_at: expiresAt,
                })
                .select("code, expires_at, issuer_role")
                .single();

            if (!error) {
                return NextResponse.json({
                    code: data.code,
                    expiresAt: data.expires_at,
                    issuerRole: data.issuer_role,
                });
            }

            // Primary-key collision: retry with a fresh code.
            if ((error as { code?: string }).code !== "23505") {
                return errorResponse("links:generate", error, 500, {
                    userId,
                });
            }
        }

        return errorResponse(
            "links:generate",
            new Error(
                `Failed to generate a unique invite code after ${MAX_GENERATE_ATTEMPTS} attempts`,
            ),
            500,
            { userId },
        );
    } catch (err) {
        return errorResponse("links:generate", err, 500);
    }
}

// No role guard: the query is already scoped to the caller.
export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new Response("Unauthorised", { status: 401 });

        const blocked = await enforceRateLimit(
            req,
            "links:invite:get",
            userId,
        );
        if (blocked) return blocked;

        const { data, error } = await supabaseAdmin
            .from("link_invites")
            .select("code, expires_at, issuer_role")
            .eq("issuer_id", userId)
            .is("consumed_at", null)
            .is("revoked_at", null)
            .gt("expires_at", new Date().toISOString())
            .maybeSingle();

        if (error) {
            return errorResponse("links:invite:get", error, 500, { userId });
        }

        if (!data) return NextResponse.json({ invite: null });

        return NextResponse.json({
            invite: {
                code: data.code,
                expiresAt: data.expires_at,
                issuerRole: data.issuer_role,
            },
        });
    } catch (err) {
        return errorResponse("links:invite:get", err, 500);
    }
}

// No role guard: the issuer_id = caller clause is the authorisation.
export async function DELETE(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new Response("Unauthorised", { status: 401 });

        const blocked = await enforceRateLimit(req, "links:revoke", userId);
        if (blocked) return blocked;

        const { error } = await supabaseAdmin
            .from("link_invites")
            .update({ revoked_at: new Date().toISOString() })
            .eq("issuer_id", userId)
            .is("consumed_at", null)
            .is("revoked_at", null);

        if (error) {
            return errorResponse("links:revoke", error, 500, { userId });
        }

        return NextResponse.json({ revoked: true });
    } catch (err) {
        return errorResponse("links:revoke", err, 500);
    }
}
