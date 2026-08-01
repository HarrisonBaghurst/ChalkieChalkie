import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/*  Absorbs the two hand-rolled tags:
      `default` — the filled InfoTag (bg-foreground-third/40, caption type)
      `status`  — the bare StatusTag, which supplies its own coloured dot as a
                  child, so this variant only clears the fill and steps the
                  type up to text-small.
    Rounding is tag-tier (rounded-md), not the stock pill, matching what these
    replaced. Height is intrinsic so the tag tracks the type scale. */
const badgeVariants = cva(
  "group/badge inline-flex h-fit w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-md border border-transparent px-2 py-1 whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-foreground-third/40 text-foreground-second text-caption",
        status: "bg-transparent text-foreground-second text-small",
        secondary: "bg-secondary text-secondary-foreground text-caption",
        outline: "border-border text-foreground text-caption",
        destructive: "bg-destructive/15 text-destructive text-caption",
        success: "bg-success/15 text-success text-caption",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
