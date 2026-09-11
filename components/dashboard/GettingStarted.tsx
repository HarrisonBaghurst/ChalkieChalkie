"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import StepperFormDialog from "@/components/forms/StepperFormDialog";
import { TUTOR_ACCESS } from "@/lib/forms/tutorAccess";
import {
    ChecklistCounts,
    ChecklistPresentation,
    ChecklistRow,
    ChecklistSurface,
    resolveChecklist,
} from "@/lib/gettingStarted";
import { LinkRole } from "@/types/linkTypes";
import { useSidebarCollapse } from "./sidebarCollapse";
import { nextCardWidth } from "./Next";

type GettingStartedProps = {
    role: LinkRole;
    surface: ChecklistSurface;
    presentation: Exclude<ChecklistPresentation, "hidden">;
    counts: ChecklistCounts;
};

const PANEL_CLASS =
    "bg-card-background border border-foreground-third/15 p-5 radius-surface flex flex-col gap-6";

const ChecklistItem = ({
    row,
    index,
}: {
    row: ChecklistRow;
    index: number;
}) => {
    const actionable = !!row.href;

    const content = (
        <>
            <div
                className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border text-caption font-inter-bold",
                    row.done
                        ? "border-foreground text-foreground"
                        : "border-foreground-third text-foreground-third",
                )}
            >
                {row.done ? <CheckIcon className="size-4" /> : index + 1}
            </div>
            <div className="flex min-w-0 flex-col items-start gap-2">
                <p
                    className={cn(
                        "text-body",
                        row.done ? "text-foreground-third" : "text-foreground",
                    )}
                >
                    {row.title}
                </p>
                <p className="text-caption text-foreground-third">{row.body}</p>
            </div>
        </>
    );

    if (!actionable) {
        return <div className="flex gap-4 p-4 radius-control">{content}</div>;
    }

    return (
        <Link
            href={row.href!}
            aria-label={row.cta}
            className="group/row flex gap-4 p-4 radius-control outline-none transition-colors hover:bg-card-background-hover focus-visible:ring-3 focus-visible:ring-ring/50"
        >
            {content}
        </Link>
    );
};

const GettingStarted = ({
    role,
    surface,
    presentation,
    counts,
}: GettingStartedProps) => {
    const { collapsed } = useSidebarCollapse();
    const [requestOpen, setRequestOpen] = useState(false);

    const rows = resolveChecklist(role, surface, presentation, counts);

    const width =
        presentation === "page"
            ? "w-fit p-6 md:p-12"
            : surface === "connections"
              ? nextCardWidth(collapsed)
              : "flex-1 min-w-0";

    return (
        <div className={cn(PANEL_CLASS, width)}>
            {presentation === "page" ? (
                <div className="flex flex-col gap-1">
                    <p className="text-heading font-inter-bold">
                        Getting started
                    </p>
                    <p className="text-foreground-third">
                        Three steps before your first lesson.
                    </p>
                </div>
            ) : (
                <p className="text-caption font-inter-regular">
                    Getting started
                </p>
            )}

            <div className="-m-4 flex flex-col gap-0">
                {rows.map((row, index) => (
                    <ChecklistItem key={row.title} row={row} index={index} />
                ))}
            </div>

            {role === "student" && counts.linkCount === 0 && (
                <div className="mt-auto flex flex-col gap-2 border-t border-foreground-third/25 pt-5">
                    <Button
                        variant="outline"
                        size="default"
                        onClick={() => setRequestOpen(true)}
                        className="w-full"
                    >
                        Upgrade to a tutor account
                    </Button>
                </div>
            )}

            {requestOpen && (
                <StepperFormDialog
                    spec={TUTOR_ACCESS}
                    onClose={() => setRequestOpen(false)}
                />
            )}
        </div>
    );
};

type GettingStartedTakeoverProps = Omit<GettingStartedProps, "presentation">;

export const GettingStartedTakeover = ({
    role,
    surface,
    counts,
}: GettingStartedTakeoverProps) => (
    <div className="absolute inset-0 z-30 overflow-y-auto overscroll-contain bg-background/80 duration-200 animate-in fade-in-0">
        <div className="flex min-h-full items-center justify-center p-4">
            <GettingStarted
                role={role}
                surface={surface}
                presentation="page"
                counts={counts}
            />
        </div>
    </div>
);

export default GettingStarted;
