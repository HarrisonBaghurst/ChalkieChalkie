import React from "react";
import { cn } from "@/lib/utils";
import { PANEL_SURFACE } from "../cardSurface";

export const longDate = (iso: string | null): string | null => {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
};

export const daysUntil = (iso: string | null): number | null => {
    if (!iso) return null;
    const at = new Date(iso).getTime();
    if (Number.isNaN(at)) return null;
    return Math.max(0, Math.ceil((at - Date.now()) / (24 * 60 * 60 * 1000)));
};

export const plural = (count: number, one: string, many = `${one}s`) =>
    `${count} ${count === 1 ? one : many}`;

type SettingsCardProps = {
    title: string;
    description?: string;
    tone?: "default" | "warning" | "danger";
    children: React.ReactNode;
};

export const SettingsCard = ({
    title,
    description,
    tone = "default",
    children,
}: SettingsCardProps) => (
    <section
        className={cn(
            PANEL_SURFACE,
            "flex w-full flex-col gap-6",
            tone === "warning" && "bg-warning/15 border-warning/45",
            tone === "danger" && "bg-destructive/15 border-destructive/45",
        )}
    >
        <div className="flex flex-col gap-1.5">
            <h2 className="text-subheading">{title}</h2>
            {description && (
                <p className="text-caption text-foreground-second">
                    {description}
                </p>
            )}
        </div>
        {children}
    </section>
);

export const SettingsRows = ({ children }: { children: React.ReactNode }) => (
    <dl className="flex flex-col divide-y divide-foreground-third/25">
        {children}
    </dl>
);

export const SettingsRow = ({
    label,
    action,
    children,
}: {
    label: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) => (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-6">
            <dt className="text-small text-foreground-second sm:w-40 sm:shrink-0">
                {label}
            </dt>
            <dd className="text-small text-foreground-second">{children}</dd>
        </div>
        {action && <div className="shrink-0">{action}</div>}
    </div>
);

export const SettingsAction = ({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
}) => (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex flex-col gap-1">
            <p className="text-body text-foreground">{title}</p>
            <p className="text-caption text-foreground-second">{description}</p>
        </div>
        <div className="shrink-0">{children}</div>
    </div>
);
