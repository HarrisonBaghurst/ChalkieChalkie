"use client";

import { Block, Caption, Code, Grid, Note, Section } from "../primitives";

/**
 * Shape, surface and motion: the rounding tiers, the shared control chrome, the
 * chalk gradient family and the handful of animations in the app.
 */
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
            title="Chalk gradient"
            description="The one piece of brand colour, a four-stop sweep from butter through orange and red to pink. It is an accent — it marks the product's own moments (brand mark, empty states, loading) and never carries meaning that status colours should carry."
        >
            <div className="flex flex-col gap-8">
                <Grid cols={2}>
                    <div className="flex flex-col gap-2">
                        <div className="gradient-border radius-surface h-24 w-full" />
                        <Code>.gradient-border</Code>
                        <Caption>
                            Card fill with the gradient at 25% on the border.
                            The resting state.
                        </Caption>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="gradient-border-bright radius-surface h-24 w-full" />
                        <Code>.gradient-border-bright</Code>
                        <Caption>
                            Same, at full chroma. For the one element that
                            should draw the eye.
                        </Caption>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="gradient-card radius-surface h-24 w-full" />
                        <Code>.gradient-card</Code>
                        <Caption>
                            Interactive variant — hover it. Fill lifts to the
                            hover surface and the border reaches full chroma.
                        </Caption>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="gradient-background radius-surface h-24 w-full" />
                        <Code>.gradient-background</Code>
                        <Caption>
                            Solid gradient fill. Use behind dark text only.
                        </Caption>
                    </div>
                </Grid>

                <div className="flex flex-col gap-2">
                    <p className="gradient-text text-display">Chalkie Chalkie</p>
                    <Code>.gradient-text</Code>
                    <Caption>
                        Gradient clipped to text at 75% alpha. Headline-sized
                        text only — it loses legibility below the heading step.
                    </Caption>
                </div>

                <Note>
                    All four fill/border variants share one gradient definition
                    driven by <Code>--gb-fill</Code> and <Code>--gb-alpha</Code>.
                    A new variant overrides those two values; it does not
                    duplicate the stops.
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
                <div className="flex flex-col gap-2">
                    <div className="gradient-radial-glow radius-surface h-24 w-full" />
                    <Code>.gradient-radial-glow</Code>
                    <Caption>
                        Soft warm bloom for hero backdrops. Currently unused.
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
                            1.6s chalk sweep across loading placeholders.
                        </Caption>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex h-20 items-center justify-center">
                            <div className="spinner-chalk size-10 animate-spin" />
                        </div>
                        <Code>.spinner-chalk</Code>
                        <Caption>
                            Conic chalk ring, masked to a 3px stroke. Pair with{" "}
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
