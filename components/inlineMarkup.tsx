import React from "react";

export const LINK_CLASS =
    "text-sky-400 underline underline-offset-2 transition-colors hover:text-sky-300";

// [label](url), **bold**, {{CONTACT_EMAIL}}
const INLINE_RE =
    /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\{\{CONTACT_EMAIL\}\}/g;

export function renderInline(
    text: string,
    contactEmail: string,
): React.ReactNode {
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;
    let match: RegExpExecArray | null;

    // Reset because the regex is module-scoped and stateful (global flag).
    INLINE_RE.lastIndex = 0;

    while ((match = INLINE_RE.exec(text)) !== null) {
        if (match.index > lastIndex) {
            nodes.push(text.slice(lastIndex, match.index));
        }

        const [full, linkLabel, linkHref, boldText] = match;

        if (linkLabel !== undefined) {
            nodes.push(
                <a
                    key={key++}
                    href={linkHref}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={LINK_CLASS}
                >
                    {linkLabel}
                </a>,
            );
        } else if (boldText !== undefined) {
            nodes.push(
                <strong key={key++} className="text-foreground">
                    {boldText}
                </strong>,
            );
        } else {
            nodes.push(
                <a
                    key={key++}
                    href={`mailto:${contactEmail}`}
                    className={LINK_CLASS}
                >
                    {contactEmail}
                </a>,
            );
        }

        lastIndex = match.index + full.length;
    }

    if (lastIndex < text.length) {
        nodes.push(text.slice(lastIndex));
    }

    return nodes;
}
