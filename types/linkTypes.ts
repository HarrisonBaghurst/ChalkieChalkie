import { userInfo } from "@/types/userTypes";

// Role an invite code was issued under. A student's code is redeemable only
// by a tutor, and vice versa. Deliberately excludes "admin": admin confers no
// product privileges (lib/roles.ts), so an admin can hold no links.
export type LinkRole = "student" | "tutor";

// Raw `tutor_links` row shape (snake_case, as stored in Supabase).
export type TutorLinkRow = {
    id: string;
    tutor_id: string;
    student_id: string;
    created_at: string;
    created_by: string;
};

// Raw `link_invites` row shape (snake_case, as stored in Supabase).
export type LinkInviteRow = {
    code: string;
    issuer_id: string;
    issuer_role: LinkRole;
    created_at: string;
    expires_at: string;
    consumed_at: string | null;
    consumed_by: string | null;
    revoked_at: string | null;
};

// Client-facing view of a live invite code.
export type LinkInvite = {
    code: string;
    expiresAt: string;
    issuerRole: LinkRole;
};

// One row in the students/tutors list: the counterparty's profile plus context
// about the relationship.
export type LinkSummary = {
    linkId: string;
    counterparty: userInfo;
    createdAt: string;
    sharedWorkspaces: number;
};
