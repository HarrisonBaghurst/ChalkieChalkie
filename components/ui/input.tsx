import * as React from "react"

import { cn } from "@/lib/utils"

/*  Built on `.control-surface` (globals.css) — the same chrome as tabs,
    dropdown triggers and buttons, rather than a hand-rolled border. That file
    already names inputs as an intended consumer of that class.

    Fill is bumped a tier lighter than control-surface's default
    card-background, to card-background-hover — control-surface's own
    "brighten on interaction" tone, repurposed here as the resting fill so an
    input reads as a distinct surface against a card/modal background that's
    already at card-background. The utility-layer `bg-*` outranks the
    component-layer `control-surface` background, same mechanism as the
    type-scale note below.

    No `text-*` utility here: `text-small` is a component-layer class and a
    utility-layer `text-base`/`md:text-sm` would outrank it. */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "control-surface bg-card-background-hover w-full min-w-0 px-3 py-2 text-small text-foreground transition-colors outline-none file:inline-flex file:border-0 file:bg-transparent file:text-foreground placeholder:text-foreground-third focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
