import { Code, Note } from "./primitives";
import Colour from "./sections/Colour";
import Typography from "./sections/Typography";
import Surfaces from "./sections/Surfaces";
import Components from "./sections/Components";
import Conventions from "./sections/Conventions";

const NAV = [
    { id: "colour", label: "Colour" },
    { id: "typography", label: "Typography" },
    { id: "surfaces", label: "Shape & surface" },
    { id: "components", label: "Components" },
    { id: "conventions", label: "Layout & conventions" },
];

/**
 * The admin-only style guide. Rendered by `app/style-guide/page.tsx`, which
 * gates it on the `admin` account role.
 *
 * This is the reference for any new UI work: it shows the real tokens and the
 * real primitives, not a description of them, so it can't quietly go stale. If
 * you add a token, a utility class or a shared component, add it here too.
 */
const StyleGuide = () => (
    <div className="min-h-dvh bg-background">
        <header className="border-b border-border px-[6dvw] py-16">
            <div className="mx-auto flex max-w-6xl flex-col gap-4">
                <span className="text-caption text-foreground-third">
                    Internal · admin only
                </span>
                <h1 className="text-display gradient-text w-fit">
                    Style guide
                </h1>
                <p className="text-body text-foreground-second max-w-3xl">
                    The design system behind Chalkie Chalkie: the colour tokens,
                    type scale, shape language and shared components that every
                    surface is built from. Read it before adding UI, and match
                    what is here rather than introducing a parallel pattern.
                </p>
                <nav className="mt-2 flex flex-wrap gap-2">
                    {NAV.map((item) => (
                        <a
                            key={item.id}
                            href={`#${item.id}`}
                            className="control-surface px-4 py-2 text-small text-foreground-second transition-colors hover:bg-card-background-hover hover:text-foreground"
                        >
                            {item.label}
                        </a>
                    ))}
                </nav>
            </div>
        </header>

        <main className="mx-auto flex max-w-6xl flex-col gap-20 px-[6dvw] py-16">
            <Note>
                Sources of truth: tokens and utility classes in{" "}
                <Code>app/globals.css</Code>, shared components in{" "}
                <Code>components/ui</Code>, the class merger in{" "}
                <Code>lib/utils.ts</Code>. This page renders those directly — if
                a specimen below looks wrong, the system changed and this page is
                telling you the truth.
            </Note>

            <Colour />
            <Typography />
            <Surfaces />
            <Components />
            <Conventions />

            <footer className="border-t border-border pt-8">
                <p className="text-small text-foreground-third">
                    Missing something? Add the specimen to{" "}
                    <Code>components/styleGuide/sections</Code> in the same
                    change that introduces the pattern.
                </p>
            </footer>
        </main>
    </div>
);

export default StyleGuide;
