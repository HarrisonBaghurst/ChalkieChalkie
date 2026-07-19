import React from "react";
import type {
    PolicyBlock,
    PolicyDocument as PolicyDocumentType,
} from "@/types/policyTypes";

/**
 * Renders a {@link PolicyDocumentType} as a centred, scrollable information
 * page using the site's typography scale. Content-agnostic: pass a different
 * JSON document to render a different policy page (terms, cookies, etc.).
 *
 * Server component — reads no browser APIs so `contactEmail` stays server-side.
 */
const PolicyDocument = ({
    document,
    contactEmail,
}: {
    document: PolicyDocumentType;
    contactEmail: string;
}) => {
    return (
        <div className="h-dvh overflow-y-auto bg-background">
            <article className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8 sm:py-24">
                <header className="mb-12">
                    <h1 className="text-display mb-3">{document.title}</h1>
                    <p className="text-small text-foreground-third">
                        Last updated {document.lastUpdated}
                    </p>
                </header>

                {document.intro && document.intro.length > 0 && (
                    <div className="mb-14 flex flex-col gap-4">
                        {document.intro.map((block, i) => (
                            <Block
                                key={i}
                                block={block}
                                contactEmail={contactEmail}
                            />
                        ))}
                    </div>
                )}

                <div className="flex flex-col gap-14">
                    {document.sections.map((section) => (
                        <section
                            key={section.id}
                            id={section.id}
                            className="scroll-target flex flex-col gap-4"
                        >
                            <h2 className="text-heading text-foreground">
                                {section.heading}
                            </h2>
                            {section.blocks.map((block, i) => (
                                <Block
                                    key={i}
                                    block={block}
                                    contactEmail={contactEmail}
                                />
                            ))}
                        </section>
                    ))}
                </div>
            </article>
        </div>
    );
};

/** Renders a single content block. */
const Block = ({
    block,
    contactEmail,
}: {
    block: PolicyBlock;
    contactEmail: string;
}) => {
    switch (block.type) {
        case "paragraph":
            return (
                <p className="text-body text-foreground-second">
                    {renderInline(block.text, contactEmail)}
                </p>
            );
        case "subheading":
            return (
                <h3 className="text-subheading text-foreground mt-2">
                    {renderInline(block.text, contactEmail)}
                </h3>
            );
        case "list": {
            const ListTag = block.ordered ? "ol" : "ul";
            return (
                <ListTag
                    className={`text-body text-foreground-second flex list-outside flex-col gap-2 pl-5 ${
                        block.ordered ? "list-decimal" : "list-disc"
                    }`}
                >
                    {block.items.map((item, i) => (
                        <li key={i} className="pl-1">
                            {renderInline(item, contactEmail)}
                        </li>
                    ))}
                </ListTag>
            );
        }
        case "definitions":
            return (
                <dl className="flex flex-col gap-4">
                    {block.items.map((item, i) => (
                        <div
                            key={i}
                            className="control-surface flex flex-col gap-1 p-4"
                        >
                            <dt className="text-subheading text-foreground">
                                {renderInline(item.term, contactEmail)}
                            </dt>
                            <dd className="text-body text-foreground-second">
                                {renderInline(item.description, contactEmail)}
                            </dd>
                        </div>
                    ))}
                </dl>
            );
    }
};

const LINK_CLASS =
    "text-sky-400 underline underline-offset-2 transition-colors hover:text-sky-300";

/**
 * Parses lightweight inline markup into React nodes:
 *   `[label](url)`, `{{CONTACT_EMAIL}}`, and `**bold**`.
 */
const INLINE_RE =
    /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\{\{CONTACT_EMAIL\}\}/g;

function renderInline(text: string, contactEmail: string): React.ReactNode {
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
            // {{CONTACT_EMAIL}} placeholder.
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

export default PolicyDocument;
