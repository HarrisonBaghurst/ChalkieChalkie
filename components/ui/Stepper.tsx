"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type Step = {
    id: number;
    label: string;
};

type StepperProps = {
    steps: Step[];
    current: number;
    onStepChange: (id: number) => void;
    // Gates which steps are reachable by clicking. Defaults to all of them —
    // the workspace modal lets you jump freely, while the contact flow only
    // opens a step once the ones before it validate.
    canJumpTo?: (id: number) => boolean;
    className?: string;
};

// Numbered step indicator with a connecting rule between each pair. Not a
// shadcn primitive — the registry has no stepper — but it lives alongside them
// because it is the same kind of shared, restyle-in-one-place component.
const Stepper = ({
    steps,
    current,
    onStepChange,
    canJumpTo = () => true,
    className,
}: StepperProps) => {
    return (
        <div className={cn("flex items-center justify-between px-2", className)}>
            {steps.map((s, i) => {
                const reachable = canJumpTo(s.id);
                const active = current === s.id;
                const complete = current > s.id;
                return (
                    <React.Fragment key={s.id}>
                        <button
                            type="button"
                            onClick={() => {
                                if (reachable) onStepChange(s.id);
                            }}
                            disabled={!reachable}
                            aria-current={active ? "step" : undefined}
                            className={cn(
                                "flex flex-col items-center gap-1 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                                reachable
                                    ? "cursor-pointer"
                                    : "cursor-not-allowed",
                            )}
                        >
                            <div
                                className={cn(
                                    "w-7 h-7 rounded-full flex items-center justify-center text-caption font-inter-bold transition-colors",
                                    active
                                        ? "bg-foreground text-background"
                                        : complete
                                          ? "border border-foreground text-foreground"
                                          : "border border-foreground-third text-foreground-third",
                                )}
                            >
                                {s.id}
                            </div>
                            <div
                                className={cn(
                                    "text-caption",
                                    active
                                        ? "text-foreground"
                                        : "text-foreground-third",
                                )}
                            >
                                {s.label}
                            </div>
                        </button>
                        {i < steps.length - 1 && (
                            <div className="flex-1 h-px bg-foreground-third mx-2 -mt-4" />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default Stepper;
