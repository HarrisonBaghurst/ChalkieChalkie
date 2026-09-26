"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OPTION_PANEL } from "@/components/dashboard/cardSurface";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { PLAN_LABELS } from "@/lib/plans/labels";
import { PLAN_COPY, planRank } from "@/lib/plans/pricingCopy";
import { responseDenialCopy } from "@/lib/planDenialCopy";
import { cn } from "@/lib/utils";
import { PlanId, SwitchWhen } from "@/types/planTypes";

type PlanActionButtonProps = {
    plan: PlanId;
    currentPlan: PlanId | null;
    signedIn: boolean;
    hasSubscription: boolean;
    currentPeriodEnd: string | null;
    cancelling: boolean;
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
    currentPeriodEnd,
    cancelling,
}: PlanActionButtonProps) => {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [adult, setAdult] = useState(false);

    const closeFirstPlan = () => {
        setConfirming(false);
        setAdult(false);
    };

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

    const upgrade = switching && !downgrade;

    const firstPlan = !hasGrantedPlan;

    const renewal = effectiveLabel(currentPeriodEnd);

    const submit = async (when?: SwitchWhen) => {
        if (submitting) return;
        setSubmitting(true);

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/billing/${switching ? "switch" : "checkout"}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(when ? { plan, when } : { plan }),
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
                        : "Your new limits apply straight away, and your billing date has moved to today.",
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

    const price = PLAN_COPY[plan].price;
    const currentPrice = currentPlan ? PLAN_COPY[currentPlan].price : null;

    return (
        <>
            <Button
                variant="outline"
                size="lg"
                disabled={submitting}
                onClick={
                    switching || firstPlan
                        ? () => setConfirming(true)
                        : () => submit()
                }
                className={cn("w-full", !hasGrantedPlan && LIFT_ON_CARD_HOVER)}
            >
                {submitting ? "Working..." : action}
            </Button>

            {confirming && firstPlan && (
                <Dialog
                    open
                    onOpenChange={(open) => !open && closeFirstPlan()}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{action}?</DialogTitle>
                            <DialogDescription>
                                {`Plans are for tutors. Buying ${label} turns this into a tutor account, so you can create workspaces and invite students to them.`}
                            </DialogDescription>
                        </DialogHeader>

                        <div className={OPTION_PANEL}>
                            <p className="text-small">
                                Learning with a tutor? You don&apos;t need a
                                plan.
                            </p>
                            <p className="text-caption text-foreground-third">
                                Your tutor&apos;s plan covers every lesson they
                                invite you to, so students never pay. If your
                                tutor has asked you to join, ask them for a
                                link code instead.
                            </p>
                        </div>

                        <label className="flex cursor-pointer items-start gap-3">
                            <Checkbox
                                checked={adult}
                                onCheckedChange={(checked) =>
                                    setAdult(checked === true)
                                }
                                className="mt-0.5"
                            />
                            <span className="text-small text-foreground-second">
                                I confirm I am 18 or over. Plans can only be
                                bought by adults.
                            </span>
                        </label>

                        <DialogFooter>
                            <Button
                                variant="ghost"
                                size="default"
                                onClick={closeFirstPlan}
                            >
                                Cancel
                            </Button>

                            <Button
                                variant="default"
                                size="default"
                                disabled={submitting || !adult}
                                onClick={() => submit()}
                            >
                                {submitting
                                    ? "Working..."
                                    : "Continue to payment"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {confirming && switching && (
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
                                    : `Plans are never part-charged or part-refunded. ${label} is paid for a full month either way — choose when that month starts.`}
                            </DialogDescription>
                        </DialogHeader>

                        {downgrade ? (
                            <div className={OPTION_PANEL}>
                                <p className="text-small">
                                    Nothing is charged or refunded today.
                                </p>
                                <p className="text-caption text-foreground-third">
                                    You carry on paying the {currentLabel} price
                                    for the billing period you have already
                                    bought, so there is no refund for the rest
                                    of it. Your next invoice is the first one at
                                    the {label} price, on your usual billing
                                    date.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <div className={OPTION_PANEL}>
                                    <p className="text-small">
                                        Upgrade now — you are charged {price}{" "}
                                        today
                                    </p>
                                    <p className="text-caption text-foreground-third">
                                        {label} starts immediately and {price}{" "}
                                        is taken today for a full month.{" "}
                                        {currentPrice
                                            ? `The ${currentPrice} you have already paid for this ${currentLabel} month is not refunded and does not come off the ${price}, so ${currentPrice} and ${price} are both charged this month.`
                                            : `What you have already paid for this ${currentLabel} month is not refunded and does not come off the ${price}.`}{" "}
                                        Your billing date moves to today, so the
                                        next {price} is taken a month from now.
                                    </p>
                                </div>

                                {!cancelling && (
                                    <div className={OPTION_PANEL}>
                                        <p className="text-small">
                                            {renewal
                                                ? `Upgrade on ${renewal} — nothing today`
                                                : "Upgrade next period — nothing today"}
                                        </p>
                                        <p className="text-caption text-foreground-third">
                                            You keep {currentLabel} for the rest
                                            of the month you have paid for.{" "}
                                            {label} takes over{" "}
                                            {renewal
                                                ? `on ${renewal}`
                                                : "at your next renewal"}{" "}
                                            and is charged then, on your usual
                                            billing date.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                variant="ghost"
                                size="default"
                                onClick={() => setConfirming(false)}
                            >
                                {downgrade ? `Keep ${currentLabel}` : "Cancel"}
                            </Button>

                            {upgrade && !cancelling && (
                                <Button
                                    variant="outline"
                                    size="default"
                                    disabled={submitting}
                                    onClick={() => submit("period-end")}
                                >
                                    {renewal
                                        ? `Start on ${renewal}`
                                        : "Start next period"}
                                </Button>
                            )}

                            <Button
                                variant={downgrade ? "destructive" : "default"}
                                size="default"
                                disabled={submitting}
                                onClick={() =>
                                    submit(downgrade ? "period-end" : "now")
                                }
                            >
                                {submitting
                                    ? "Working..."
                                    : downgrade
                                      ? action
                                      : `Pay ${price} now`}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
};

export default PlanActionButton;
