import { CheckIcon } from "lucide-react";
import {
    ACTIVE_SURFACE,
    PANEL_SURFACE,
} from "@/components/dashboard/cardSurface";
import { Badge } from "@/components/ui/badge";
import { PLAN_LABELS } from "@/lib/plans/labels";
import { PLAN_COPY, PLAN_ORDER } from "@/lib/plans/pricingCopy";
import { cn } from "@/lib/utils";
import { PlanId } from "@/types/planTypes";
import PlanActionButton from "./PlanActionButton";

type PricingTiersProps = {
    currentPlan: PlanId | null;
    signedIn: boolean;
    hasHadPlan: boolean;
    hasSubscription: boolean;
};

const PricingTiers = ({
    currentPlan,
    signedIn,
    hasHadPlan,
    hasSubscription,
}: PricingTiersProps) => (
    <div className="grid w-full items-stretch gap-6 md:grid-cols-3">
        {PLAN_ORDER.map((plan) => {
            const copy = PLAN_COPY[plan];
            const current = currentPlan === plan;

            return (
                <div
                    key={plan}
                    className={cn(
                        current ? ACTIVE_SURFACE : PANEL_SURFACE,
                        "group/plan flex flex-col gap-6",
                    )}
                >
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-subheading mr-auto">
                                {PLAN_LABELS[plan]}
                            </p>
                            {current && (
                                <Badge variant="highlight">Current plan</Badge>
                            )}
                            {plan === "basic" && !hasHadPlan && (
                                <Badge variant="outline">
                                    Free trial available
                                </Badge>
                            )}
                        </div>

                        <div className="flex items-baseline gap-2">
                            <p className="text-heading">{copy.price}</p>
                            <p className="text-small text-foreground-third">
                                {copy.cadence}
                            </p>
                        </div>

                        <p className="text-body text-foreground-second">
                            {copy.tagline}
                        </p>
                    </div>

                    <ul className="flex flex-col gap-3">
                        {copy.features.map((feature) => (
                            <li key={feature} className="flex gap-3">
                                <CheckIcon className="mt-1 size-4 shrink-0 text-brand" />
                                <span className="text-small text-foreground-second">
                                    {feature}
                                </span>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-auto pt-2">
                        <PlanActionButton
                            plan={plan}
                            currentPlan={currentPlan}
                            signedIn={signedIn}
                            hasSubscription={hasSubscription}
                        />
                    </div>
                </div>
            );
        })}
    </div>
);

export default PricingTiers;
