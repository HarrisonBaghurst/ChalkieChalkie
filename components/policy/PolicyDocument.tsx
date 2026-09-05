import React from "react";
import type {
    PolicyBlock,
    PolicyDocument as PolicyDocumentType,
} from "@/types/policyTypes";
import { renderInline } from "@/components/inlineMarkup";

const PolicyDocument = ({
    document,
    contactEmail,
}: {
    document: PolicyDocumentType;
    contactEmail: string;
}) => {
    return (
        <div className="w-full">
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

export default PolicyDocument;
