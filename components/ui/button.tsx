import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding whitespace-nowrap transition-all outline-none select-none cursor-pointer focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    {
        variants: {
            variant: {
                default:
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                secondary:
                    "bg-secondary text-secondary-foreground hover:bg-accent aria-expanded:bg-accent",
                outline:
                    "bg-accent text-foreground hover:bg-foreground-third/35 aria-expanded:bg-foreground-third/35",
                ghost: "text-foreground hover:bg-accent aria-expanded:bg-accent",
                destructive:
                    "bg-destructive text-foreground hover:bg-destructive/90 focus-visible:border-destructive/40 focus-visible:ring-destructive/30",
                success:
                    "bg-success text-foreground hover:bg-success/90 focus-visible:border-success/40 focus-visible:ring-success/30",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                xs: "h-fit gap-1 rounded-[min(var(--radius-md),10px)] px-2 py-0.5 text-caption",
                sm: "h-fit gap-1.5 rounded-[min(var(--radius-md),12px)] px-3 py-1 text-caption",
                default: "h-fit gap-1.5 px-5 py-2 text-caption",
                lg: "h-fit gap-2 px-7 py-2.5 text-body",
                icon: "size-9",
                "icon-xs": "size-6 rounded-[min(var(--radius-md),10px)]",
                "icon-sm": "size-7 rounded-[min(var(--radius-md),12px)]",
                "icon-lg": "size-11",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    },
);

function Button({
    className,
    variant = "default",
    size = "default",
    asChild = false,
    ...props
}: React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
    }) {
    const Comp = asChild ? Slot.Root : "button";

    return (
        <Comp
            data-slot="button"
            data-variant={variant}
            data-size={size}
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    );
}

export { Button, buttonVariants };
