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

/**
 * Colour section: the semantic token set, the shadcn bridge that sits on top of
 * it, and the two fixed palettes that live in TypeScript rather than CSS.
 */
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
                    usage="The brighten-on-hover state for anything filled with --card-background."
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
            title="Status and chrome"
            description="Status colours are used sparingly and never as a decorative accent — that job belongs to the chalk gradient below."
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
                        usage="= --card-background-hover. Hover fill for ghost/outline/secondary buttons and menu items."
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
            description="Fixed hexes in lib/colours.ts, not CSS tokens — they are canvas paint, drawn into a <canvas> where CSS variables don't reach. Chosen to sit on the dark board and to echo the chalk gradient."
        >
            <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-3">
                    <Caption>PEN_COLOURS — pen tool</Caption>
                    <Grid cols={5}>
                        {PEN_COLOURS.map((c) => (
                            <HexSwatch
                                key={c.code}
                                name={c.colour}
                                code={c.code}
                            />
                        ))}
                    </Grid>
                </div>
                <div className="flex flex-col gap-3">
                    <Caption>
                        HIGHLIGHT_COLOURS — highlighter tool (drawn at reduced
                        alpha)
                    </Caption>
                    <Grid cols={4}>
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
            description="SELECTION_COLOURS in lib/colours.ts — what the pointer tool draws over whatever is selected. Deliberately achromatic and semitransparent: a selection marks what has been picked up, so it must never read as a colour the user drew. All three are rgba mirrors of --foreground-second, which canvas paint can't reference as a token."
        >
            <div className="flex flex-col gap-3">
                <Grid cols={3}>
                    <HexSwatch
                        name="border"
                        code={SELECTION_COLOURS.border}
                    />
                    <HexSwatch name="fill" code={SELECTION_COLOURS.fill} />
                    <HexSwatch name="stroke" code={SELECTION_COLOURS.stroke} />
                </Grid>
                <Note>
                    <Code>border</Code> outlines the drag marquee and every
                    selected image; <Code>fill</Code> washes the area inside
                    both. Strokes have no area, so <Code>stroke</Code> is traced
                    over them wider than the stroke itself to leave a halo. The
                    marquee outline is solid — a dashed border reads as a
                    drawing on a whiteboard.
                </Note>
            </div>
        </Block>

        <Block
            title="Per-user identity colours"
            description="USER_COLOUR_PALETTE in lib/userColour.ts. A Clerk userId is hashed to a fixed index, so a person keeps the same colour across their live cursor and the participant roster in every session. Never assign these by array position or at random."
        >
            <Grid cols={5}>
                {USER_COLOUR_PALETTE.map((code) => (
                    <HexSwatch key={code} name="" code={code} />
                ))}
            </Grid>
        </Block>
    </Section>
);

export default Colour;
