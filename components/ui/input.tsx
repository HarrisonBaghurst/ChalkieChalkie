import * as React from "react"

import { cn } from "@/lib/utils"

/*  Matches the class string this replaces (see git history: `inputClass`, once
    duplicated across BasicsStep, FeedbackStep and SendMessage) with one
    deliberate change — the old `focus:outline-none` removed the focus ring and
    put nothing back, so keyboard users got no feedback. shadcn's
    focus-visible ring is kept.

    No `text-*` utility here: `text-small` is a component-layer class and a
    utility-layer `text-base`/`md:text-sm` would outrank it. */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "w-full min-w-0 rounded-lg border border-foreground-third bg-transparent px-3 py-2 text-small text-foreground transition-colors outline-none file:inline-flex file:border-0 file:bg-transparent file:text-foreground placeholder:text-foreground-third focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
