import * as React from "react"

import { cn } from "@/lib/utils"

/*  Mirrors `Input` exactly — built on `.control-surface` with `resize-none`
    appended, baked in here rather than repeated at every call site. See the
    note in input.tsx on `.control-surface`, the card-background-hover fill,
    and on why no `text-*` utility appears in this list. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "control-surface bg-card-background-hover flex w-full min-w-0 resize-none px-3 py-2 text-small text-foreground transition-colors outline-none placeholder:text-foreground-third focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
