"use client";

import { cn } from "@/lib/utils";
import { PLAN_LABELS } from "@/lib/plans/labels";
import { planFactsLine, resolveUsageMeters, UsageMeter } from "@/lib/planUsage";
import { PlanEntitlements, PlanId, PlanUsage } from "@/types/planTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PANEL_CLASS } from "./GettingStarted";

type UsageProps = {
    entitlements: PlanEntitlements;
    usage: PlanUsage | null;
    linkedStudents: number | null;
    planId?: PlanId | null;
};

const Meter = ({ meter }: { meter: UsageMeter }) => (
    <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
            <p className="text-body">{meter.label}</p>
            <p
                className={cn(
                    "text-body font-inter-bold text-nowrap",
                    meter.atLimit ? "text-destructive" : "text-foreground",
                )}
            >
                {meter.tally}
            </p>
        </div>
        {meter.ratio !== null && (
            <div
                role="progressbar"
                aria-label={meter.label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(meter.ratio * 100)}
                className="h-1.5 w-full overflow-hidden rounded-full bg-foreground-third/25"
            >
                <div
                    style={{ width: `${meter.ratio * 100}%` }}
                    className={cn(
                        "h-full rounded-full transition-[width] duration-300",
                        meter.atLimit ? "bg-destructive" : "bg-foreground",
                    )}
                />
            </div>
        )}
        <p className="text-caption text-foreground-third">{meter.caption}</p>
    </div>
);

const Usage = ({ entitlements, usage, linkedStudents, planId }: UsageProps) => {
    const meters = resolveUsageMeters(entitlements, usage, linkedStudents);

    return (
        <div className={cn(PANEL_CLASS, "flex-1 min-w-0")}>
            <div className="flex items-center justify-between gap-3">
                <p className="text-caption font-inter-regular">Your plan</p>
                {planId && (
                    <Badge variant="highlight">{PLAN_LABELS[planId]}</Badge>
                )}
            </div>

            <div className="flex flex-col gap-5">
                {meters.map((meter) => (
                    <Meter key={meter.key} meter={meter} />
                ))}
            </div>

            <div className="mt-auto flex flex-col gap-3 border-t border-foreground-third/25 pt-5">
                <p className="text-caption text-foreground-third">
                    {planFactsLine(entitlements)}
                </p>
                {planId !== "professional" && (
                    <Button
                        variant="outline"
                        size="default"
                        disabled
                        className="w-full"
                    >
                        Change plan
                        <Badge variant="outline">Upcoming</Badge>
                    </Button>
                )}
            </div>
        </div>
    );
};

export default Usage;
