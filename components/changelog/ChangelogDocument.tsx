import React from "react";
import { Badge } from "@/components/ui/badge";
import { renderInline } from "@/components/inlineMarkup";
import type {
    ChangelogChange,
    ChangelogDocument as ChangelogDocumentType,
    ChangeTag,
} from "@/types/changelogTypes";

const TAG_VARIANT: Record<
    ChangeTag,
    "success" | "default" | "outline" | "destructive"
> = {
    Added: "success",
    Fixed: "default",
    Changed: "outline",
    Removed: "destructive",
};

const anchorFor = (version: string) =>
    `v${version.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

const ChangelogDocument = ({
    document,
    contactEmail,
}: {
    document: ChangelogDocumentType;
    contactEmail: string;
}) => {
    return (
        <div className="w-full">
            <article className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8 sm:py-24">
                <header className="mb-12">
                    <h1 className="text-display mb-3">{document.title}</h1>
                    <p className="text-small text-foreground-third">
                        Current version {document.currentVersion}
                    </p>
                </header>

                {document.intro && (
                    <p className="text-body text-foreground-second mb-14">
                        {renderInline(document.intro, contactEmail)}
                    </p>
                )}

                <div className="flex flex-col gap-14">
                    {document.entries.map((entry) => (
                        <section
                            key={entry.version}
                            id={anchorFor(entry.version)}
                            className="scroll-target flex flex-col gap-4"
                        >
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                <h2 className="text-heading text-foreground">
                                    {entry.version}
                                </h2>
                                <p className="text-small text-foreground-third">
                                    {entry.date}
                                </p>
                            </div>
                            <ul className="text-body text-foreground-second flex list-outside list-disc flex-col gap-2 pl-5">
                                {entry.changes.map((change, i) => (
                                    <Change
                                        key={i}
                                        change={change}
                                        contactEmail={contactEmail}
                                    />
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            </article>
        </div>
    );
};

const Change = ({
    change,
    contactEmail,
}: {
    change: ChangelogChange;
    contactEmail: string;
}) => {
    if (typeof change === "string") {
        return <li className="pl-1">{renderInline(change, contactEmail)}</li>;
    }

    return (
        <li className="pl-1">
            <Badge variant={TAG_VARIANT[change.tag]} className="mr-2">
                {change.tag}
            </Badge>
            {renderInline(change.text, contactEmail)}
        </li>
    );
};

export default ChangelogDocument;
