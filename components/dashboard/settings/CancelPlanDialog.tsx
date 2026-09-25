"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { PLAN_LABELS } from "@/lib/plans/labels";
import { responseDenialCopy } from "@/lib/planDenialCopy";
import { PlanId } from "@/types/planTypes";
import { AccountLosses } from "@/types/settingsTypes";
import { longDate, plural } from "./SettingsSection";

type CancelPlanDialogProps = {
    plan: PlanId;
    periodEnd: string | null;
    pendingPlan: PlanId | null;
    losses: AccountLosses | null;
};

const CancelPlanDialog = ({
    plan,
    periodEnd,
    pendingPlan,
    losses,
}: CancelPlanDialogProps) => {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const label = PLAN_LABELS[plan];
    const ends = longDate(periodEnd);
    const on = ends ? `on ${ends}` : "at the end of your billing period";

    const submit = async () => {
        if (submitting) return;
        setSubmitting(true);

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/billing/cancel`,
                { method: "POST" },
            );

            if (!res.ok) {
                const denial = await responseDenialCopy(res);
                toast.error(denial?.title ?? "Could not cancel your plan.", {
                    description: denial?.description ?? "Please try again.",
                });
                return;
            }

            toast.success(`Your ${label} plan ends ${on}.`, {
                description: "You keep everything it allows until then.",
            });
            setOpen(false);
            router.refresh();
        } catch (err) {
            console.error(err);
            toast.error("Something went wrong.");
        } finally {
            setSubmitting(false);
        }
    };

    const lost = [
        losses && losses.hostedUpcoming > 0
            ? `Your ${plural(losses.hostedUpcoming, "upcoming lesson")} stop opening, for you and your students.`
            : "Your lessons stop opening, for you and your students.",
        losses && losses.links > 0
            ? `Your links to ${plural(losses.links, "student")} are deactivated.`
            : "Any students you link before then are deactivated.",
        "You can no longer create workspaces or add students.",
        "Your workspaces are kept for up to 30 days, then deleted unless you subscribe again.",
    ];

    return (
        <>
            <Button
                variant="destructive"
                size="default"
                onClick={() => setOpen(true)}
            >
                Cancel plan
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel your {label} plan?</DialogTitle>
                        <DialogDescription>
                            You keep everything {label} allows until the end of
                            the period you have paid for. Your plan ends {on}{" "}
                            and does not renew.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-3">
                        <div className={OPTION_PANEL}>
                            <p className="text-small">
                                Nothing is charged or refunded today.
                            </p>
                            <p className="text-caption text-foreground-third">
                                No further payments are taken. You can keep
                                your plan from Settings at any point before it
                                ends.
                                {pendingPlan &&
                                    ` Your scheduled change to ${PLAN_LABELS[pendingPlan]} is also cancelled.`}
                            </p>
                        </div>

                        <div className={OPTION_PANEL}>
                            <p className="text-small">
                                {ends ? `On ${ends} you lose` : "When it ends you lose"}
                            </p>
                            <ul className="text-caption text-foreground-third flex list-outside list-disc flex-col gap-1 pl-4">
                                {lost.map((line) => (
                                    <li key={line}>{line}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            size="default"
                            onClick={() => setOpen(false)}
                        >
                            Keep {label}
                        </Button>
                        <Button
                            variant="destructive"
                            size="default"
                            disabled={submitting}
                            onClick={submit}
                        >
                            {submitting ? "Working..." : "Cancel plan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default CancelPlanDialog;
