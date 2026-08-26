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
//
// Under sm the numbered row collapses to a labelled progress bar: five labels
// need roughly 600px, which is what the dialogs holding this give it from sm
// up but never below. The seam is sm rather than the dashboard's lg because
// this is purely about how much width the labels need — a 1000px viewport has
// plenty.
const Stepper = ({
    steps,
    current,
    onStepChange,
    canJumpTo = () => true,
    className,
}: StepperProps) => {
    const currentStep = steps.find((s) => s.id === current);

    return (
        <>
            <div className={cn("flex flex-col gap-2 px-2 sm:hidden", className)}>
                <p className="text-caption text-foreground-third">
                    Step {current} of {steps.length}
                    {currentStep ? ` · ${currentStep.label}` : ""}
                </p>
                <div
                    role="progressbar"
                    aria-valuemin={1}
                    aria-valuemax={steps.length}
                    aria-valuenow={current}
                    className="h-1 w-full overflow-hidden rounded-full bg-foreground-third/25"
                >
                    <div
                        className="h-full gradient-background transition-[width] duration-200"
                        style={{
                            width: `${(current / steps.length) * 100}%`,
                        }}
                    />
                </div>
            </div>
            <div
                className={cn(
                    "hidden items-center justify-between px-2 sm:flex",
                    className,
                )}
            >
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
        </>
    );
};

export default Stepper;
