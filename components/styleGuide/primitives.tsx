"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared furniture for the admin style guide (`app/style-guide`).
 *
 * Everything here is deliberately plain: the page's job is to show the design
 * system, so its own chrome must not invent new patterns to compete with the
 * specimens. Swatches and type samples read their values back off the DOM at
 * runtime rather than repeating literals from globals.css, so the page cannot
 * drift out of date when a token changes.
 */

/** A top-level, anchored section of the guide. */
export const Section = ({
    id,
    title,
    intro,
    children,
}: {
    id: string;
    title: string;
    intro?: React.ReactNode;
    children: React.ReactNode;
}) => (
    <section id={id} className="scroll-target flex flex-col gap-8">
        <div className="flex flex-col gap-3">
            <h2 className="text-heading text-foreground">{title}</h2>
            {intro && (
                <p className="text-body text-foreground-second max-w-3xl">
                    {intro}
                </p>
            )}
        </div>
        {children}
    </section>
);

/**
 * A named specimen: heading, prose explaining when to reach for it, then the
 * live example on a control surface.
 */
export const Block = ({
    title,
    description,
    children,
    bodyClassName,
}: {
    title: string;
    description?: React.ReactNode;
    children: React.ReactNode;
    bodyClassName?: string;
}) => (
    <div className="flex flex-col gap-3">
        <h3 className="text-subheading text-foreground">{title}</h3>
        {description && (
            <p className="text-small text-foreground-second max-w-3xl">
                {description}
            </p>
        )}
        <div className={cn("control-surface p-6", bodyClassName)}>
            {children}
        </div>
    </div>
);

/** Inline code — class names, tokens, file paths. */
export const Code = ({ children }: { children: React.ReactNode }) => (
    <code className="rounded-[4px] bg-white/5 px-1.5 py-0.5 font-mono text-caption text-foreground-second">
        {children}
    </code>
);

const NOTE_TONES = {
    rule: "border-l-foreground",
    warn: "border-l-destructive",
    dead: "border-l-foreground-third",
} as const;

/**
 * A callout. `rule` = do this; `warn` = a trap that has already bitten us;
 * `dead` = defined in globals.css but currently unused.
 */
export const Note = ({
    tone = "rule",
    children,
}: {
    tone?: keyof typeof NOTE_TONES;
    children: React.ReactNode;
}) => (
    <p
        className={cn(
            "text-small text-foreground-second max-w-3xl border-l-2 bg-white/[0.03] py-3 pl-4",
            NOTE_TONES[tone],
        )}
    >
        {children}
    </p>
);

/** Caption under a specimen, naming the exact class or prop that produced it. */
export const Caption = ({ children }: { children: React.ReactNode }) => (
    <span className="text-caption text-foreground-third">{children}</span>
);

/** Reads a CSS custom property off `:root` so swatches show the real value. */
const useCssVariable = (name: string): string => {
    const [value, setValue] = useState("");
    useEffect(() => {
        setValue(
            getComputedStyle(document.documentElement)
                .getPropertyValue(name)
                .trim(),
        );
    }, [name]);
    return value;
};

/**
 * One colour token: a chip filled from the variable itself, the variable name,
 * its resolved value, and what the token is for.
 */
export const Swatch = ({
    token,
    usage,
}: {
    token: string;
    usage: React.ReactNode;
}) => {
    const value = useCssVariable(token);
    return (
        <div className="flex items-start gap-4">
            <div
                className="radius-tag size-12 shrink-0 border border-border"
                style={{ background: `var(${token})` }}
            />
            <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                    <Code>{token}</Code>
                    <span className="font-mono text-caption break-all text-foreground-third">
                        {value || "—"}
                    </span>
                </div>
                <span className="text-small text-foreground-second">
                    {usage}
                </span>
            </div>
        </div>
    );
};

/** A fixed hex from a TS palette (no CSS variable behind it). */
export const HexSwatch = ({
    name,
    code,
}: {
    name: string;
    code: string;
}) => (
    <div className="flex flex-col gap-1.5">
        <div
            className="radius-tag h-12 w-full border border-border"
            style={{ background: code }}
        />
        <span className="text-small text-foreground-second">{name}</span>
        <span className="font-mono text-caption text-foreground-third">
            {code}
        </span>
    </div>
);

/**
 * A type-scale specimen. Reports the font size the browser is actually
 * rendering at the current viewport width — the scale is fluid (`clamp`), so a
 * static number in prose would be true at exactly one window size.
 */
export const TypeSpecimen = ({
    className,
    usage,
    sample,
}: {
    className: string;
    usage: React.ReactNode;
    sample: string;
}) => {
    const ref = useRef<HTMLParagraphElement>(null);
    const [size, setSize] = useState("");

    useEffect(() => {
        const read = () => {
            if (ref.current) setSize(getComputedStyle(ref.current).fontSize);
        };
        read();
        window.addEventListener("resize", read);
        return () => window.removeEventListener("resize", read);
    }, []);

    return (
        <div className="flex flex-col gap-2 border-b border-border pb-6 last:border-b-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
                <Code>.{className}</Code>
                <Caption>rendering at {size || "—"} on this viewport</Caption>
            </div>
            <p ref={ref} className={cn(className, "text-foreground")}>
                {sample}
            </p>
            <span className="text-small text-foreground-second">{usage}</span>
        </div>
    );
};

/** Grid wrapper for swatch/specimen rows. */
export const Grid = ({
    cols = 2,
    children,
}: {
    cols?: 2 | 3 | 4 | 5;
    children: React.ReactNode;
}) => (
    <div
        className={cn(
            "grid gap-6",
            cols === 2 && "sm:grid-cols-2",
            cols === 3 && "sm:grid-cols-2 lg:grid-cols-3",
            cols === 4 && "grid-cols-2 lg:grid-cols-4",
            cols === 5 && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
        )}
    >
        {children}
    </div>
);
