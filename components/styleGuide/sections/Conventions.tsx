"use client";

import { Block, Code, Note, Section } from "../primitives";

const Rule = ({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) => (
    <div className="flex flex-col gap-1 border-b border-border pb-4 last:border-b-0 last:pb-0">
        <span className="text-small text-foreground">{title}</span>
        <span className="text-small text-foreground-second">{children}</span>
    </div>
);

const Conventions = () => (
    <Section
        id="conventions"
        title="Layout & conventions"
        intro="Spacing, iconography and the standing rules for anything new."
    >
        <Block
            title="Page layout"
            description="Outer page padding is viewport-relative so wide screens breathe; inner spacing uses Tailwind's fixed scale so controls stay a predictable size."
        >
            <div className="flex flex-col gap-4">
                <Rule title="Marketing and legal pages">
                    Full-bleed sections with <Code>px-[6dvw]</Code> to{" "}
                    <Code>px-[8dvw]</Code> gutters, under the fixed{" "}
                    <Code>Navbar</Code> (offset with <Code>pt-16</Code>). Long-form
                    copy is capped at <Code>max-w-4xl</Code> and centred.
                </Rule>
                <Rule title="Dashboard">
                    <Code>DashboardShell</Code> owns the chrome, mobile-first
                    with a single seam at <Code>2xl</Code>. Below it:{" "}
                    <Code>Navbar</Code> on top, the bottom <Code>TabBar</Code>{" "}
                    and its floating action button beneath, and a content column
                    running edge-to-edge. At <Code>2xl</Code> the sidebar
                    returns and the column becomes the inset panel (
                    <Code>m-2</Code>, <Code>rounded-xl</Code>,{" "}
                    <Code>p-[2.5dvw]</Code>) floating on the card surface. Page
                    content goes in the column; don&apos;t reach outside it.
                </Rule>
                <Rule title="Mobile dashboard">
                    Both tables swap for a compact row list below{" "}
                    <Code>2xl</Code>, each row opening a <Code>Sheet</Code> that
                    holds the detail and actions hover can&apos;t reach. Swap by
                    CSS (<Code>2xl:hidden</Code> / <Code>hidden 2xl:block</Code>
                    ), not a media-query hook — no hydration mismatch, no
                    first-paint flash. Nothing below <Code>2xl</Code> links to{" "}
                    <Code>/board</Code>: the canvas is desktop-only for now, and
                    that is enforced by omitting the links, not by a route
                    guard.
                </Rule>
                <Rule title="Board">
                    Everything is fixed chrome over a full-viewport canvas:
                    toolbar pinned left at <Code>left-4</Code> and vertically
                    centred, header top-left, roster top-right. New board UI
                    should be fixed and small — the canvas is the page.
                </Rule>
                <Rule title="Stacking">
                    Two layers, and only two. Fixed chrome — <Code>Navbar</Code>
                    , the mobile <Code>TabBar</Code> — sits at <Code>z-40</Code>
                    ; every Radix overlay portals to the body at{" "}
                    <Code>z-50</Code> and covers it. They share one value on
                    purpose: overlays nest by DOM order at equal z-index, so a
                    popover opened inside a dialog lands above it. Raising one
                    overlay above the rest breaks that. Avoid inventing new
                    z-index values. The one thing above both is{" "}
                    <Code>DebugBreakpoint</Code> at <Code>z-[100]</Code>, which
                    is dev-only and <Code>pointer-events-none</Code>, so it
                    never joins the nesting order it sits over.
                </Rule>
                <Rule title="Safe area">
                    Anything flush with the bottom edge on a phone — the tab
                    bar, a bottom sheet, a full-screen dialog&apos;s footer —
                    takes <Code>pb-safe</Code>, which adds the device&apos;s
                    home-indicator inset to whatever <Code>--safe-pb</Code>{" "}
                    sets. Set the base padding through that variable rather than
                    a <Code>pb-*</Code> utility; two padding-bottom declarations
                    on one element resolve by stylesheet order.
                </Rule>
                <Rule title="Breakpoint badge">
                    Set <Code>DEBUG=true</Code> in <Code>.env.local</Code> and{" "}
                    <Code>DebugBreakpoint</Code> pins the active Tailwind tier
                    and its threshold to the bottom-left of every page. It reads
                    the tier from CSS — one span per tier, shown and hidden by
                    the same utilities everything else uses — so it reports what
                    the stylesheet actually resolved, not what a resize listener
                    thinks. Unset or <Code>false</Code> renders nothing.
                </Rule>
            </div>
        </Block>

        <Block
            title="Icons"
            description="Two systems, split by where the icon lives."
        >
            <div className="flex flex-col gap-4">
                <Rule title="lucide-react — product UI">
                    Menus, buttons, form affordances. Imported as components and
                    sized by the primitive (<Code>size-4</Code> by default inside
                    Button, Badge and menu items), so they inherit{" "}
                    <Code>currentColor</Code> and need no colour class.
                </Rule>
                <Rule title="/public/icons/*.svg — canvas toolbar">
                    Rendered through <Code>next/image</Code>. Several ship as a
                    light/dark pair (<Code>house.svg</Code> /{" "}
                    <Code>house-dark.svg</Code>) because they are flat images and
                    cannot inherit colour. Prefer lucide for anything new unless
                    it must be a raster-positioned board asset.
                </Rule>
            </div>
        </Block>

        <Block
            title="Rules for new work"
            description="Each of these exists because breaking it has already caused a visible bug."
        >
            <div className="flex flex-col gap-4">
                <Note tone="rule">
                    Merge classes with <Code>cn()</Code> from{" "}
                    <Code>lib/utils.ts</Code> — never raw{" "}
                    <Code>twMerge</Code> or template-string concatenation on a
                    component that accepts <Code>className</Code>. That{" "}
                    <Code>cn</Code> is the one that knows about the type scale.
                </Note>
                <Note tone="rule">
                    Reach for a token, not a value. No hex literals, no{" "}
                    <Code>text-neutral-400</Code>, no <Code>rounded-[14px]</Code>
                    . If nothing fits, add a semantic token to{" "}
                    <Code>:root</Code> and use that.
                </Note>
                <Note tone="warn">
                    <Code>dark:</Code> modifiers are dead code. Nothing ever sets{" "}
                    <Code>.dark</Code> on <Code>&lt;html&gt;</Code> — the app is
                    permanently dark via <Code>:root</Code> — so a{" "}
                    <Code>dark:</Code> branch never fires. Strip them when
                    pasting from the shadcn registry.
                </Note>
                <Note tone="warn">
                    Don&apos;t put a <Code>text-*</Code> size utility in a
                    primitive&apos;s base class string; it outranks the
                    component-layer scale. Pass the scale class at the call site
                    instead.
                </Note>
                <Note tone="rule">
                    Adding a shadcn component: install it, then restyle it onto
                    these tokens and delete the <Code>dark:</Code> branches
                    before committing — and add a specimen to this page. Leave a
                    comment at the top of the file explaining what you changed
                    from stock and why, as the existing primitives do.
                </Note>
                <Note tone="rule">
                    British spelling in identifiers and copy —{" "}
                    <Code>colour</Code>, <Code>optimisation</Code>. The shadcn
                    token names (<Code>--color-*</Code>) are the one exception;
                    they come from the registry.
                </Note>
                <Note tone="warn">
                    Four-space indentation. There is no Prettier config in the
                    repo, so a bare <Code>npx prettier --write</Code> will
                    silently reformat files to two spaces. Files under{" "}
                    <Code>components/ui</Code> arrived from the registry at two
                    spaces and are left that way.
                </Note>
            </div>
        </Block>
    </Section>
);

export default Conventions;
