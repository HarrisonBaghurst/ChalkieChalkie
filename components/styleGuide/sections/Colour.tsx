"use client";

import {
    HIGHLIGHT_COLOURS,
    PEN_COLOURS,
    SELECTION_COLOURS,
} from "@/lib/colours";
import { USER_COLOUR_PALETTE } from "@/lib/userColour";
import {
    Block,
    Caption,
    Code,
    Grid,
    HexSwatch,
    Note,
    Section,
    Swatch,
} from "../primitives";

const Colour = () => (
    <Section
        id="colour"
        title="Colour"
        intro={
            <>
                Every colour in the app resolves to a token declared on{" "}
                <Code>:root</Code> in <Code>app/globals.css</Code>. Use the
                Tailwind utility that maps to the token (
                <Code>bg-card-background</Code>, <Code>text-foreground-third</Code>
                ) rather than a literal hex or a stock Tailwind colour — a
                literal is invisible to a future palette change, and stock
                Tailwind greys are subtly off against these surfaces.
            </>
        }
    >
        <Block
            title="Surfaces"
            description="Three stacked greys. Depth reads darkest at the back: the page sits below raised rows, which sit below cards. Don't invent a fourth level — if something needs to separate from its parent, use a border or the hover surface."
        >
            <div className="flex flex-col gap-6">
                <Swatch
                    token="--background"
                    usage="Page backdrop. The darkest surface; also the fill under the whiteboard canvas."
                />
                <Swatch
                    token="--background-second"
                    usage="Raised rows and inset panels — secondary buttons, muted fills."
                />
                <Swatch
                    token="--card-background"
                    usage="Cards, tables, modals, popovers, and the .control-surface family."
                />
                <Swatch
                    token="--card-background-hover"
                    usage="The brighten-on-hover state for anything filled with --card-background, and the resting fill of a solid outline button sitting on one."
                />
            </div>
        </Block>

        <Block
            title="Text"
            description="Three weights of emphasis, not three colours. Body copy is second, not first — reserve the full-strength foreground for headings, active states and the text you actually want read first."
        >
            <div className="flex flex-col gap-6">
                <Swatch
                    token="--foreground"
                    usage="Headings, active tabs, primary button fill, values the user is scanning for."
                />
                <Swatch
                    token="--foreground-second"
                    usage="Body copy, labels, descriptions. The default for prose."
                />
                <Swatch
                    token="--foreground-third"
                    usage="Muted text, placeholders, inactive tabs, timestamps — and the base of every hairline border."
                />
            </div>
        </Block>

        <Block
            title="Brand"
            description="One flat accent. It marks the product's own surfaces — the sign-in card, the Stepper's progress fill, the plan badge and the arriving-action ring. It is never used to distinguish one person from another; that is what the identity palette below is for."
        >
            <div className="flex flex-col gap-6">
                <Swatch
                    token="--brand"
                    usage="bg-brand, text-brand, border-brand. Also the .brand-border / .brand-border-bright / .brand-card / .brand-fill / .brand-ring family in globals.css, which are the only places it appears as a surface. A card that just needs definition takes border-foreground/50 rather than the brand."
                />
                <Swatch
                    token="--brand-foreground"
                    usage="= --background. Dark label for anything filled with --brand, and the initials colour on every identity swatch."
                />
            </div>
        </Block>

        <Block
            title="Status and chrome"
            description="Status colours are used sparingly and never as a decorative accent — that job belongs to --brand above."
        >
            <div className="flex flex-col gap-6">
                <Swatch
                    token="--destructive"
                    usage="Delete actions and error states. Button variant destructive, badge variant destructive."
                />
                <Swatch
                    token="--success"
                    usage="Confirmation only. Button variant success, badge variant success."
                />
                <Swatch
                    token="--border"
                    usage="Hairline borders. A 25% mix of --foreground-third — the same expression .control-surface uses, so a stock shadcn border and a hand-built control line up exactly."
                />
                <Swatch
                    token="--ring"
                    usage="Focus ring. Applied as ring-3 ring-ring/50 on focus-visible by every interactive primitive."
                />
            </div>
        </Block>

        <Block
            title="The shadcn token bridge"
            description="shadcn primitives address colour through their own names (--card, --popover, --primary, --muted, --accent…). Rather than maintain a second palette, every one of those aliases onto a semantic token in the block above."
        >
            <div className="flex flex-col gap-6">
                <Grid cols={2}>
                    <Swatch
                        token="--primary"
                        usage="= --foreground. The white solid button is the canonical primary action."
                    />
                    <Swatch
                        token="--accent"
                        usage="= --card-background-hover. Hover fill for ghost and secondary buttons and menu items, and the resting fill of outline, which hovers a step lighter on --foreground-third/35 rather than a fourth grey."
                    />
                </Grid>
                <Note>
                    Change a colour in the semantic block and every primitive
                    follows. Never put a literal colour value in the bridge
                    block — if a primitive needs a colour that no semantic token
                    covers, add the semantic token first.
                </Note>
                <Note tone="dead">
                    The <Code>--sidebar-*</Code> and <Code>--chart-*</Code>{" "}
                    tokens are stock shadcn scaffolding, and the sidebar set
                    still holds light-theme values. Nothing renders them — the
                    dashboard sidebar is hand-built. Don&apos;t reach for them;
                    delete-on-sight candidates.
                </Note>
                <Note tone="dead">
                    <Code>--arrow-color</Code>, <Code>--padding</Code> and{" "}
                    <Code>--gap</Code> are declared but unreferenced. Spacing
                    comes from Tailwind&apos;s scale, not from those variables.
                </Note>
            </div>
        </Block>

        <Block
            title="Drawing palettes"
            description="Fixed hexes in lib/colours.ts, not CSS tokens — they are canvas paint, drawn into a <canvas> where CSS variables don't reach. The six chromatic inks each sit on a hue between two identity hues, pushed to the most chroma sRGB will hold while staying above 6:1 against the board; saturation is what keeps them from reading as somebody's cursor, since each is more chromatic than any colour a person can be assigned. Chalk stays first — index 0 is the default the board opens with — and Black stays last."
        >
            <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-3">
                    <Caption>PEN_COLOURS — pen tool</Caption>
                    <Grid cols={4}>
                        {PEN_COLOURS.map((c) => (
                            <HexSwatch
                                key={c.code}
                                name={c.colour}
                                code={c.code}
                            />
                        ))}
                    </Grid>
                    <Note>
                        <Code>Black</Code> is not a drawing colour — it is a
                        mask. Pasted pages are inverted on upload and their
                        background filled with <Code>#000</Code> (
                        <Code>lib/imagePrepare.ts</Code>), and pen strokes paint{" "}
                        <em>over</em> images in <Code>canvasDrawing.ts</Code>,
                        so an exactly-matching black stroke reads as an eraser
                        on a past paper. It is the one ink whose hex must not be
                        adjusted for aesthetics: shift it and it stops matching
                        the fill it is hiding against.
                    </Note>
                </div>
                <div className="flex flex-col gap-3">
                    <Caption>
                        HIGHLIGHT_COLOURS — highlighter tool (drawn at reduced
                        alpha)
                    </Caption>
                    <Grid cols={5}>
                        {HIGHLIGHT_COLOURS.map((c) => (
                            <HexSwatch
                                key={c.code}
                                name={c.colour}
                                code={c.code}
                            />
                        ))}
                    </Grid>
                </div>
            </div>
        </Block>

        <Block
            title="Canvas selection chrome"
            description="SELECTION_COLOURS in lib/colours.ts — what the pointer tool draws around whatever is selected. Deliberately achromatic and semitransparent: a selection marks what has been picked up, so it must never read as a colour the user drew. An rgba mirror of --foreground-second, which canvas paint can't reference as a token."
        >
            <div className="flex flex-col gap-3">
                <Grid cols={3}>
                    <HexSwatch
                        name="border"
                        code={SELECTION_COLOURS.border}
                    />
                </Grid>
                <Note>
                    Selection is outline-only — nothing is filled or washed,
                    since a tint over a stroke changes the colour the user drew.
                    Solid outlines box each selected item; dashed ones mark the
                    bounds of a multi-item selection and the marquee being
                    dragged out. Widths and dash lengths divide by zoom, because
                    the chrome is traced in world space alongside the ink.
                </Note>
            </div>
        </Block>

        <Block
            title="Per-user identity colours"
            description="USER_COLOUR_PALETTE in lib/userColour.ts — 12 colours, one per hue at an even 30° rotation in OKLCH, each at 85% of its in-gamut chroma and gamut-fitted to sRGB. Lightness varies per hue rather than sitting flat, which is what keeps neighbouring hues apart: the closest pair is ΔE 0.135, against 0.050 for the flat 48-colour set this replaced. A Clerk userId is hashed to a fixed index, so a person keeps the same colour across their avatar, live cursor, name pill, selection outline and roster dot in every session. Never assign these by array position or at random."
        >
            <div className="flex flex-col gap-3">
                <Grid cols={6}>
                    {USER_COLOUR_PALETTE.map((code) => (
                        <HexSwatch key={code} name="" code={code} />
                    ))}
                </Grid>
                <Note>
                    Every entry sits between 5.5:1 and 12:1 against{" "}
                    <Code>--background</Code>, which is why initials are always
                    drawn in <Code>--brand-foreground</Code> and never
                    conditionally lightened. The band is deliberately narrow at
                    both ends: the floor holds the contrast, and the ceiling
                    stops a hue being driven so light it washes out beside the
                    others.
                </Note>
                <Note tone="dead">
                    The array length is load-bearing:{" "}
                    <Code>getUserColour</Code> is <Code>hash % length</Code>, so
                    adding or removing an entry reshuffles every existing
                    user&apos;s colour. Changing a hex in place is safe;
                    changing the count is not.
                </Note>
            </div>
        </Block>
    </Section>
);

export default Colour;
