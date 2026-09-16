"use client";

import { Block, Caption, Code, Grid, Note, Section } from "../primitives";

const Surfaces = () => (
    <Section
        id="surfaces"
        title="Shape & surface"
        intro={
            <>
                Rounding is role-based, mirroring the type scale: the tier is
                chosen by what the element <em>is</em>, not by how big it looks.
                All three derive from one <Code>--radius</Code> (0.625rem), so
                the whole app can be made rounder or squarer from a single line.
            </>
        }
    >
        <Block
            title="Rounding tiers"
            description="Prefer these over raw rounded-* utilities. rounded-full is still used directly for genuinely circular things (avatars, dots, the spinner)."
        >
            <Grid cols={3}>
                <div className="flex flex-col gap-2">
                    <div className="radius-tag h-20 w-full bg-card-background-hover" />
                    <Code>.radius-tag</Code>
                    <Caption>
                        8px — tags, chips, thumbnails, menu items, avatars that
                        aren&apos;t circular.
                    </Caption>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="radius-control h-20 w-full bg-card-background-hover" />
                    <Code>.radius-control</Code>
                    <Caption>
                        10px — buttons, inputs, dropdowns, toolbar buttons.
                    </Caption>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="radius-surface h-20 w-full bg-card-background-hover" />
                    <Code>.radius-surface</Code>
                    <Caption>
                        14px — cards, tables, modals, panels, the dashboard
                        content column.
                    </Caption>
                </div>
            </Grid>
        </Block>

        <Block
            title="Control surface"
            description="The canonical chrome for interactive controls — filled card surface, hairline border, control-tier rounding, 150ms colour transition. Tabs, selects, popovers and the dashboard filter bar all use it, which is what makes them read as one family."
        >
            <div className="flex flex-col gap-5">
                <div className="flex flex-wrap gap-4">
                    <div className="control-surface px-4 py-2">
                        <span className="text-small text-foreground-second">
                            .control-surface
                        </span>
                    </div>
                    <div className="control-surface cursor-pointer px-4 py-2 hover:bg-card-background-hover">
                        <span className="text-small text-foreground-second">
                            + hover:bg-card-background-hover
                        </span>
                    </div>
                </div>
                <Note>
                    Add <Code>hover:bg-card-background-hover</Code> when the
                    element is individually clickable; leave it off for static
                    containers and for tracks whose children handle their own
                    hover (the tabs bar).
                </Note>
            </div>
        </Block>

        <Block
            title="Brand surfaces"
            description="Drawn from --brand. They mark the product's own moments — the sign-in card, progress, an arriving action — and never carry meaning that a status colour should carry. Dashboard cards don't use the brand at all: they switch between the two surfaces in components/dashboard/cardSurface.ts. PANEL_SURFACE is the resting card; ACTIVE_SURFACE raises the fill to --card-background-hover and the border to --foreground/50, and is earned, not decorative — the Coming up next card wears it only while the viewer can actually open the workspace."
        >
            <div className="flex flex-col gap-8">
                <Grid cols={2}>
                    <div className="flex flex-col gap-2">
                        <div className="brand-border radius-surface h-24 w-full" />
                        <Code>.brand-border</Code>
                        <Caption>
                            Card fill with the brand at 25% on the border. The
                            resting state.
                        </Caption>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="brand-border-bright radius-surface h-24 w-full" />
                        <Code>.brand-border-bright</Code>
                        <Caption>
                            Same, at full strength. For the one element that
                            should draw the eye.
                        </Caption>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="brand-card radius-surface h-24 w-full" />
                        <Code>.brand-card</Code>
                        <Caption>
                            Interactive variant — hover it. Fill lifts to the
                            hover surface and the border reaches full strength.
                        </Caption>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="brand-fill radius-surface h-24 w-full" />
                        <Code>.brand-fill</Code>
                        <Caption>
                            Solid brand fill. Pair with{" "}
                            <Code>text-brand-foreground</Code>.
                        </Caption>
                    </div>
                </Grid>

                <div className="flex flex-col gap-2">
                    <p className="text-brand text-display">Chalkie Chalkie</p>
                    <Code>text-brand</Code>
                    <Caption>
                        Brand as a text colour. A plain Tailwind utility off{" "}
                        <Code>--color-brand</Code>, so it composes with the type
                        scale at any step.
                    </Caption>
                </div>

                <Note>
                    The three fill/border variants share one definition driven
                    by <Code>--bb-fill</Code> and <Code>--bb-alpha</Code>. A new
                    variant overrides those two values; it does not restate the
                    border.
                </Note>
            </div>
        </Block>

        <Block
            title="Board & page textures"
            description="Backgrounds that establish where you are."
        >
            <Grid cols={2}>
                <div className="flex flex-col gap-2">
                    <div className="dotted-paper radius-surface h-24 w-full bg-background" />
                    <Code>.dotted-paper</Code>
                    <Caption>
                        40px dot grid. The whiteboard surface — also used on the
                        sign-in, 404 and fullscreen loader pages so they read as
                        part of the board.
                    </Caption>
                </div>
            </Grid>
        </Block>

        <Block
            title="Motion"
            description="Motion is quiet and functional. Colour transitions are 150ms, surface changes 200ms; Radix primitives bring their own 100ms open/close fade and zoom."
        >
            <div className="flex flex-col gap-6">
                <Grid cols={3}>
                    <div className="flex flex-col gap-2">
                        <div className="relative h-20 w-full overflow-hidden rounded-md bg-white/5">
                            <div className="skeleton-shimmer" />
                        </div>
                        <Code>.skeleton-shimmer</Code>
                        <Caption>
                            1.6s grey sweep across loading placeholders.
                        </Caption>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex h-20 items-center justify-center">
                            <div className="spinner-chalk size-10 animate-spin" />
                        </div>
                        <Code>.spinner-chalk</Code>
                        <Caption>
                            Conic grey ring, masked to a 3px stroke. Pair with{" "}
                            <Code>animate-spin</Code>.
                        </Caption>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex h-20 items-center justify-center">
                            <div className="animate-bob size-10 rounded-md bg-card-background-hover" />
                        </div>
                        <Code>.animate-bob</Code>
                        <Caption>
                            4s float for hero art. Bakes in{" "}
                            <Code>scale(1.1)</Code>.
                        </Caption>
                    </div>
                </Grid>
                <Note>
                    <Code>.animate-bob</Code> is disabled under{" "}
                    <Code>prefers-reduced-motion</Code>. Any new looping,
                    decorative animation must do the same — one-shot transitions
                    on interaction are fine.
                </Note>
            </div>
        </Block>
    </Section>
);

export default Surfaces;
