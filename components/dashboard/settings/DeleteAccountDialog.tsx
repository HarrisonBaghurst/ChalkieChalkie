"use client";

import { useState } from "react";
import { useClerk, useReverification } from "@clerk/nextjs";
import { isReverificationCancelledError } from "@clerk/nextjs/errors";
import { toast } from "sonner";
import { OPTION_PANEL } from "@/components/dashboard/cardSurface";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    DELETE_ACCOUNT_PHRASE,
    matchesDeletePhrase,
} from "@/lib/accountDeletion";
import { PLAN_LABELS } from "@/lib/plans/labels";
import { DenialBody, planDenialCopy } from "@/lib/planDenialCopy";
import { AccountLosses, PlanSummary } from "@/types/settingsTypes";
import { UserRole } from "@/types/userTypes";
import { daysUntil, plural } from "./SettingsSection";

type DeleteAccountDialogProps = {
    role: UserRole;
    plan: PlanSummary;
    losses: AccountLosses | null;
};

type Loss = {
    title: string;
    detail: string;
};

type DeleteResponse = DenialBody & { deleted?: boolean };

const planLoss = (plan: PlanSummary): Loss | null => {
    if (!plan.plan || !plan.granting) return null;
    const label = PLAN_LABELS[plan.plan];

    if (plan.comped) {
        return {
            title: `Your complimentary ${label} plan is removed`,
            detail: "It was set up by hand and cannot be restored.",
        };
    }

    const days = daysUntil(plan.cancelsAt ?? plan.currentPeriodEnd);
    const remaining =
        days && days > 0
            ? `The ${plural(days, "day")} left of the period you have paid for are lost and not refunded.`
            : "Nothing is refunded.";

    return {
        title: `Your ${label} plan is cancelled immediately`,
        detail: `${remaining} The cancellation cannot be reversed.`,
    };
};

const workspaceLoss = (losses: AccountLosses): Loss | null => {
    const total = losses.hostedUpcoming + losses.hostedPast;
    if (total === 0) return null;

    const students =
        losses.affectedStudents > 0
            ? ` ${plural(losses.affectedStudents, "student")} lose${losses.affectedStudents === 1 ? "s" : ""} access to their upcoming lessons with you.`
            : "";

    return {
        title: `${plural(total, "workspace")} you host ${total === 1 ? "is" : "are"} deleted`,
        detail: `${losses.hostedUpcoming} upcoming and ${losses.hostedPast} past, including every board, drawing and uploaded image.${students}`,
    };
};

const accountLosses = (
    role: UserRole,
    plan: PlanSummary,
    losses: AccountLosses | null,
): Loss[] => {
    const counterpart = role === "tutor" ? "student" : "tutor";

    return [
        planLoss(plan),
        losses && workspaceLoss(losses),
        losses && losses.links > 0
            ? {
                  title: `Your ${plural(losses.links, "connection")} ${losses.links === 1 ? "is" : "are"} removed`,
                  detail: `Each ${counterpart} would need a new link code to connect with you again.`,
              }
            : null,
        losses && losses.joinedWorkspaces > 0
            ? {
                  title: `You are removed from ${plural(losses.joinedWorkspaces, "workspace")} you joined`,
                  detail: "Their hosts keep them.",
              }
            : null,
        {
            title: "Your sign-in and profile are deleted",
            detail: "Your email address can be used to sign up again, but the new account starts empty.",
        },
    ].filter((loss): loss is Loss => !!loss);
};

const DeleteAccountDialog = ({
    role,
    plan,
    losses,
}: DeleteAccountDialogProps) => {
    const { signOut } = useClerk();
    const [open, setOpen] = useState(false);
    const [confirmation, setConfirmation] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const request = useReverification(
        (value: string): Promise<Response> =>
            fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/account`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmation: value }),
            }),
    );

    const matches = matchesDeletePhrase(confirmation);

    const close = (next: boolean) => {
        if (submitting) return;
        setOpen(next);
        if (!next) setConfirmation("");
    };

    const submit = async () => {
        if (submitting || !matches) return;
        setSubmitting(true);

        try {
            const body = (await request(confirmation)) as unknown as DeleteResponse;

            if (!body?.deleted) {
                const denial = planDenialCopy(body ?? {});
                toast.error(
                    denial?.title ?? "Your account could not be fully deleted.",
                    {
                        description:
                            denial?.description ??
                            "Anything already removed stays removed. Please try again.",
                    },
                );
                return;
            }

            toast.success("Your account has been deleted.");
            await signOut({ redirectUrl: "/" }).catch(() =>
                window.location.assign("/"),
            );
        } catch (err) {
            if (isReverificationCancelledError(err)) return;
            console.error(err);
            toast.error("Something went wrong.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Button
                variant="destructive"
                size="default"
                onClick={() => setOpen(true)}
            >
                Delete account
            </Button>

            <Dialog open={open} onOpenChange={close} modal={!submitting}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete your account?</DialogTitle>
                        <DialogDescription>
                            This permanently deletes your account and
                            everything below. It cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-3">
                        {accountLosses(role, plan, losses).map((loss) => (
                            <div key={loss.title} className={OPTION_PANEL}>
                                <p className="text-small">{loss.title}</p>
                                <p className="text-caption text-foreground-third">
                                    {loss.detail}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-2">
                        <p className="text-small text-foreground-second">
                            Type{" "}
                            <span className="font-inter-bold text-foreground">
                                {DELETE_ACCOUNT_PHRASE}
                            </span>{" "}
                            to confirm.
                        </p>
                        <Input
                            value={confirmation}
                            onChange={(event) =>
                                setConfirmation(event.target.value)
                            }
                            placeholder={DELETE_ACCOUNT_PHRASE}
                            autoComplete="off"
                            spellCheck={false}
                            aria-label={`Type ${DELETE_ACCOUNT_PHRASE} to confirm`}
                            disabled={submitting}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            size="default"
                            disabled={submitting}
                            onClick={() => close(false)}
                        >
                            Keep my account
                        </Button>
                        <Button
                            variant="destructive"
                            size="default"
                            disabled={!matches || submitting}
                            onClick={submit}
                        >
                            {submitting ? "Deleting..." : "Delete account"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default DeleteAccountDialog;
