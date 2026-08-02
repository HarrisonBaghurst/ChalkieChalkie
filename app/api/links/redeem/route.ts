import { fetchUserProfiles } from "@/lib/clerkUsers";
import { errorResponse } from "@/lib/errorResponse";
import { countSharedWorkspaces } from "@/lib/links";
import { enforceRateLimit } from "@/lib/ratelimit";
import { requireLinkRole } from "@/lib/serverRole";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { LinkSummary } from "@/types/linkTypes";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { validateRedeemBody, type RedeemBody } from "../_shared";

// One message for every branch whose truth depends on the code existing, so
// this endpoint is never an existence oracle for guessed codes.
const INVALID_CODE_MESSAGE = "That code is invalid or has expired";

/**
 * Redeem an invite code, creating a tutor_links row between the issuer and
 * the caller. Works in both directions — a student's code is redeemable only
 * by a tutor, and vice versa.
 *
 * @route POST /api/links/redeem
 */
export async function POST(req: Request) {
    // Per-IP guard before auth (cheap flood defence), mirroring
    // liveblocks-auth's ordering.
    const ipBlocked = await enforceRateLimit(req, "links:redeem:ip");
    if (ipBlocked) return ipBlocked;

    const { userId } = await auth();
    if (!userId) return new Response("Unauthorised", { status: 401 });

    try {
        const blocked = await enforceRateLimit(req, "links:redeem", userId);
        if (blocked) return blocked;

        let body: RedeemBody;
        try {
            body = (await req.json()) as RedeemBody;
        } catch {
            return new Response("Invalid JSON body", { status: 400 });
        }

        const validated = validateRedeemBody(body);
        if (validated instanceof Response) return validated;

        const role = await requireLinkRole(userId);
        if (role instanceof Response) return role;

        // Read-only checks before any write, so a wrong-role redeemer can
        // never burn someone else's code.
        const { data: invite, error: inviteError } = await supabaseAdmin
            .from("link_invites")
            .select(
                "issuer_id, issuer_role, expires_at, consumed_at, revoked_at",
            )
            .eq("code", validated.code)
            .maybeSingle();

        if (inviteError) {
            return errorResponse("links:redeem", inviteError, 500, {
                userId,
            });
        }

        if (!invite) {
            return NextResponse.json(
                { error: INVALID_CODE_MESSAGE },
                { status: 404 },
            );
        }

        const invalid =
            invite.revoked_at !== null ||
            invite.consumed_at !== null ||
            new Date(invite.expires_at).getTime() <= Date.now() ||
            invite.issuer_id === userId ||
            invite.issuer_role === role;

        if (invalid) {
            return NextResponse.json(
                { error: INVALID_CODE_MESSAGE },
                { status: 404 },
            );
        }

        const tutorId = role === "tutor" ? userId : invite.issuer_id;
        const studentId = role === "student" ? userId : invite.issuer_id;

        const { data: existingLink, error: existingLinkError } =
            await supabaseAdmin
                .from("tutor_links")
                .select("id")
                .eq("tutor_id", tutorId)
                .eq("student_id", studentId)
                .maybeSingle();

        if (existingLinkError) {
            return errorResponse("links:redeem", existingLinkError, 500, {
                userId,
            });
        }

        if (existingLink) {
            return NextResponse.json(
                { error: "You are already linked to this person" },
                { status: 409 },
            );
        }

        // Atomic claim: a compare-and-swap under a row lock, so exactly one
        // concurrent redeem request can win. Claim before insert — a failed
        // claim leaves the code untouched (10 more minutes of validity, no
        // harm); a failed insert after a successful claim just burns one
        // code, recoverable by the issuer regenerating.
        const { data: claimed, error: claimError } = await supabaseAdmin
            .from("link_invites")
            .update({
                consumed_at: new Date().toISOString(),
                consumed_by: userId,
            })
            .eq("code", validated.code)
            .is("consumed_at", null)
            .is("revoked_at", null)
            .gt("expires_at", new Date().toISOString())
            .select("code")
            .maybeSingle();

        if (claimError) {
            return errorResponse("links:redeem", claimError, 500, {
                userId,
            });
        }

        if (!claimed) {
            // Lost the race, or expired in the gap since the read above.
            return NextResponse.json(
                { error: INVALID_CODE_MESSAGE },
                { status: 404 },
            );
        }

        const { data: insertedLink, error: insertError } = await supabaseAdmin
            .from("tutor_links")
            .insert({
                tutor_id: tutorId,
                student_id: studentId,
                created_by: userId,
            })
            .select("id, created_at")
            .single();

        let linkId: string;
        let createdAt: string;

        if (insertError) {
            if ((insertError as { code?: string }).code === "23505") {
                // A concurrent redeem already created this exact pair —
                // idempotent, so look the row up rather than failing.
                const { data: existing, error: lookupError } =
                    await supabaseAdmin
                        .from("tutor_links")
                        .select("id, created_at")
                        .eq("tutor_id", tutorId)
                        .eq("student_id", studentId)
                        .single();

                if (lookupError) {
                    return errorResponse("links:redeem", lookupError, 500, {
                        userId,
                    });
                }
                linkId = existing.id;
                createdAt = existing.created_at;
            } else {
                return errorResponse("links:redeem", insertError, 500, {
                    userId,
                });
            }
        } else {
            linkId = insertedLink.id;
            createdAt = insertedLink.created_at;
        }

        const [counterparty, counts] = await Promise.all([
            fetchUserProfiles([invite.issuer_id]),
            countSharedWorkspaces(userId, [invite.issuer_id]),
        ]);

        if (!counterparty[0]) {
            return errorResponse(
                "links:redeem",
                new Error("Counterparty profile missing after redeem"),
                500,
                { userId },
            );
        }

        const link: LinkSummary = {
            linkId,
            counterparty: counterparty[0],
            createdAt,
            sharedWorkspaces: counts[invite.issuer_id] ?? 0,
        };

        return NextResponse.json({ link });
    } catch (err) {
        return errorResponse("links:redeem", err, 500, { userId });
    }
}
