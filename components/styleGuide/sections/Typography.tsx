"use client";

import { Block, Code, Note, Section, TypeSpecimen } from "../primitives";

/**
 * Type section: the six-step fluid scale, the three loaded families, and the
 * two traps that come with implementing a scale as component-layer classes.
 */
const Typography = () => (
    <Section
        id="typography"
        title="Typography"
        intro={
            <>
                Six semantic steps, declared in <Code>@layer components</Code> in{" "}
                <Code>app/globals.css</Code>. Each one bundles a family, a fluid{" "}
                <Code>clamp()</Code> size and a line height, so picking a step
                picks all three. Always use a step — never a raw{" "}
                <Code>text-sm</Code> / <Code>text-lg</Code> utility, and never a
                bare <Code>font-size</Code>.
            </>
        }
    >
        <Block title="The scale">
            <div className="flex flex-col gap-6">
                <TypeSpecimen
                    className="text-display"
                    sample="Your teaching & learning tool"
                    usage="Hero and page titles. One per page, at most. InterBold, 40px → 64px."
                />
                <TypeSpecimen
                    className="text-heading"
                    sample="Upcoming lessons"
                    usage="Section headings within a page. InterBold, 24px → 30px."
                />
                <TypeSpecimen
                    className="text-subheading"
                    sample="Workspace details"
                    usage="Card titles, modal titles, sub-section headings. InterBold, 18px → 22px."
                />
                <TypeSpecimen
                    className="text-body"
                    sample="Tutors schedule lessons with students and share one live board."
                    usage="Default prose. Pair with text-foreground-second. InterRegular, 15px → 17px."
                />
                <TypeSpecimen
                    className="text-small"
                    sample="Last opened 2 hours ago"
                    usage="Dense UI text: inputs, menu items, table cells, tab labels. InterRegular, 13px → 14px."
                />
                <TypeSpecimen
                    className="text-caption"
                    sample="Started Tuesday, 16:30"
                    usage="Metadata, button labels, tags, helper text. InterRegular, 11px → 12px."
                />
            </div>
        </Block>

        <Block
            title="Families"
            description="Three faces are loaded as @font-face from /public/fonts, plus Geist via next/font as the --font-sans fallback on <html>."
        >
            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                    <Code>font-inter-bold</Code>
                    <p className="font-inter-bold text-body text-foreground">
                        InterBold — carried by every heading step. Reach for the
                        utility directly only when you need weight without a
                        size change.
                    </p>
                </div>
                <div className="flex flex-col gap-1">
                    <Code>font-inter-regular</Code>
                    <p className="font-inter-regular text-body text-foreground-second">
                        InterRegular — the body face, and the default on{" "}
                        <Code>body</Code>.
                    </p>
                </div>
                <div className="flex flex-col gap-1">
                    <Code>font-libre</Code>
                    <p className="font-libre text-body text-foreground-second">
                        Libre Baskerville — a single accent face, currently used
                        only for the workspace card title. Use it as a
                        deliberate editorial accent, not as an alternative body
                        font.
                    </p>
                </div>
            </div>
        </Block>

        <Block title="Two traps">
            <div className="flex flex-col gap-4">
                <Note tone="warn">
                    The scale lives in the components layer, so a utility-layer{" "}
                    <Code>text-sm</Code> outranks it and silently wins. That is
                    why no shadcn primitive in <Code>components/ui</Code> carries
                    a <Code>text-*</Code> size in its base class string — sizing
                    comes from the scale. Keep it that way when you add one.
                </Note>
                <Note tone="warn">
                    <Code>tailwind-merge</Code> can&apos;t see the scale either:
                    it reads <Code>text-display</Code> as a text{" "}
                    <em>colour</em> and drops whichever of size/colour came
                    first. <Code>lib/utils.ts</Code> registers the six steps as
                    font-size classes to fix that — which is why{" "}
                    <Code>cn()</Code> from that file is the only class merger you
                    should use.
                </Note>
            </div>
        </Block>
    </Section>
);

export default Typography;
