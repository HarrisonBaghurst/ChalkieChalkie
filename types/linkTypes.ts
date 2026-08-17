import { userInfo } from "@/types/userTypes";

// A student's code is redeemable only by a tutor, and vice versa. Admin is
// excluded because it confers no product privileges.
export type LinkRole = "student" | "tutor";

export type TutorLinkRow = {
    id: string;
    tutor_id: string;
    student_id: string;
    created_at: string;
    created_by: string;
};

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

export type LinkInvite = {
    code: string;
    expiresAt: string;
    issuerRole: LinkRole;
};

export type LinkSummary = {
    linkId: string;
    counterparty: userInfo;
    createdAt: string;
    sharedWorkspaces: number;
};
