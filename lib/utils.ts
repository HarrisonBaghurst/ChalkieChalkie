import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The type scale (text-display … text-caption, defined in @layer components in
// globals.css) is invisible to tailwind-merge: it sees `text-*` with a value it
// doesn't recognise and files it under text-colour. It then treats the size
// class and a real colour class as conflicting and keeps only the last one.
//
// That silently drops whichever came first — which is how a `bg-primary
// text-primary-foreground` button ends up with no colour class at all and
// inherits white body text on a white fill. Registering the scale as font-size
// classes lets a size and a colour coexist, and is why the buttons this
// replaced needed `text-background!` to force the issue.
const twMerge = extendTailwindMerge({
    extend: {
        classGroups: {
            "font-size": [
                {
                    text: [
                        "display",
                        "heading",
                        "subheading",
                        "body",
                        "small",
                        "caption",
                    ],
                },
            ],
        },
    },
});

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
