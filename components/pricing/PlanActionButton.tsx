"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { planRank } from "@/lib/plans/pricingCopy";
import { responseDenialCopy } from "@/lib/planDenialCopy";
import { cn } from "@/lib/utils";
import { PlanId } from "@/types/planTypes";

type PlanActionButtonProps = {
    plan: PlanId;
    currentPlan: PlanId | null;
    signedIn: boolean;
    hasSubscription: boolean;
};

const LIFT_ON_CARD_HOVER =
    "group-hover/plan:bg-primary group-hover/plan:text-primary-foreground hover:bg-primary/90";

const effectiveLabel = (iso: unknown): string | null => {
    if (typeof iso !== "string") return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
    });
};

const PlanActionButton = ({
    plan,
    currentPlan,
    signedIn,
    hasSubscription,
}: PlanActionButtonProps) => {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [confirming, setConfirming] = useState(false);

    const label = PLAN_LABELS[plan];

    if (!signedIn) {
        return (
            <Button
                asChild
                variant="outline"
                size="lg"
                className={cn("w-full", LIFT_ON_CARD_HOVER)}
            >
                <Link href="/sign-in?redirect_url=/pricing">Get started</Link>
            </Button>
        );
    }

    if (currentPlan === plan && hasSubscription) {
        return (
            <Button variant="outline" size="lg" disabled className="w-full">
                Your current plan
            </Button>
        );
    }

    const hasGrantedPlan = currentPlan !== null;

    const switching = hasGrantedPlan && hasSubscription;

    const downgrade =
        currentPlan !== null &&
        hasSubscription &&
        planRank(plan) < planRank(currentPlan);

    const submit = async () => {
        if (submitting) return;
        setSubmitting(true);

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/billing/${switching ? "switch" : "checkout"}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ plan }),
                },
            );

            if (!res.ok) {
                const denial = await responseDenialCopy(res);
                toast.error(denial?.title ?? "Could not change your plan.", {
                    description: denial?.description ?? "Please try again.",
                });
                return;
            }

            const body = (await res.json()) as {
                url?: string;
                effectiveAt?: string | null;
            };

            if (body.url) {
                window.location.href = body.url;
                return;
            }

            const effective = effectiveLabel(body.effectiveAt);

            toast.success(
                effective
                    ? `${label} starts on ${effective}.`
                    : `You are now on ${label}.`,
                {
                    description: effective
                        ? "Your current plan runs until then, so nothing changes today."
                        : "Your new limits apply straight away.",
                },
            );

            setConfirming(false);
            router.refresh();
        } catch (err) {
            console.error(err);
            toast.error("Something went wrong.");
        } finally {
            setSubmitting(false);
        }
    };

    const action = switching
        ? downgrade
            ? `Switch to ${label}`
            : `Upgrade to ${label}`
        : `Choose ${label}`;

    const currentLabel = currentPlan
        ? PLAN_LABELS[currentPlan]
        : "your current plan";

    return (
        <>
            <Button
                variant="outline"
                size="lg"
                disabled={submitting}
                onClick={switching ? () => setConfirming(true) : submit}
                className={cn("w-full", !hasGrantedPlan && LIFT_ON_CARD_HOVER)}
            >
                {submitting ? "Working..." : action}
            </Button>

            {confirming && (
                <Dialog
                    open
                    onOpenChange={(open) => !open && setConfirming(false)}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{action}?</DialogTitle>
                            <DialogDescription>
                                {downgrade
                                    ? `You keep everything ${currentLabel} allows until the end of the period you have paid for. ${label} takes over from then, which lowers how many lessons, students and days of storage you have.`
                                    : `${label} starts as soon as you confirm, and its higher limits reach the lessons and students you already have, not only the ones you create next.`}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col gap-2 radius-surface border border-foreground-third/15 bg-background-second p-4">
                            <p className="text-small">
                                {downgrade
                                    ? "Nothing is charged or refunded today."
                                    : "You are not charged today."}
                            </p>
                            <p className="text-caption text-foreground-third">
                                {downgrade
                                    ? `You carry on paying the ${currentLabel} price for the billing period you have already bought, so there is no refund for the rest of it. Your next invoice is the first one at the ${label} price, on your usual billing date.`
                                    : `We credit the part of this billing period you have not used on ${currentLabel} and charge those same days at the ${label} price. The difference is added to your next invoice, alongside the ${label} monthly fee. Your billing date does not change.`}
                            </p>
                        </div>

                        <DialogFooter>
                            <Button
                                variant="ghost"
                                size="default"
                                onClick={() => setConfirming(false)}
                            >
                                {downgrade ? `Keep ${currentLabel}` : "Cancel"}
                            </Button>
                            <Button
                                variant={downgrade ? "destructive" : "default"}
                                size="default"
                                disabled={submitting}
                                onClick={submit}
                            >
                                {submitting ? "Working..." : action}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
};

export default PlanActionButton;
