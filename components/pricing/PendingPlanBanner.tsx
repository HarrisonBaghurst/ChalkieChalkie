"use client";

import { PANEL_SURFACE } from "@/components/dashboard/cardSurface";
import { Button } from "@/components/ui/button";
import { useKeepPlan } from "@/hooks/useKeepPlan";
import { PLAN_LABELS } from "@/lib/plans/labels";
import { resetLabel } from "@/lib/planDenialCopy";
import { cn } from "@/lib/utils";
import { PlanId } from "@/types/planTypes";

type PendingPlanBannerProps = {
    currentPlan: PlanId | null;
    pendingPlan: PlanId | null;
    pendingPlanAt: string | null;
    cancelsAt: string | null;
};

const PendingPlanBanner = ({
    currentPlan,
    pendingPlan,
    pendingPlanAt,
    cancelsAt,
}: PendingPlanBannerProps) => {
    const keeping = currentPlan ? PLAN_LABELS[currentPlan] : "your plan";
    const { keep, submitting } = useKeepPlan(keeping);

    return (
        <div
            className={cn(
                PANEL_SURFACE,
                "flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
            )}
        >
            <div className="flex flex-col gap-1">
                <p className="text-body">
                    {pendingPlan
                        ? `Your plan changes to ${PLAN_LABELS[pendingPlan]} ${resetLabel(pendingPlanAt ?? undefined)}.`
                        : `Your plan ends ${resetLabel(cancelsAt ?? undefined)}.`}
                </p>
                <p className="text-caption text-foreground-third">
                    {pendingPlan
                        ? `Nothing changes before then — you keep everything ${keeping} allows until the end of the period you have paid for.`
                        : `Nothing changes before then. After that your lessons stop opening and your students are unlinked, though nothing is deleted for another 30 days.`}
                </p>
            </div>

            <Button
                variant="outline"
                size="default"
                disabled={submitting}
                onClick={keep}
                className="shrink-0"
            >
                {submitting ? "Working..." : `Keep ${keeping}`}
            </Button>
        </div>
    );
};

export default PendingPlanBanner;
