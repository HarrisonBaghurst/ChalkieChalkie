import * as React from "react"

import { cn } from "@/lib/utils"

/*  Mirrors `Input` exactly — the class string it replaces was the same one with
    `resize-none` appended, so that is baked in here rather than repeated at
    every call site. See the note in input.tsx on the focus ring and on why no
    `text-*` utility appears in this list. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex w-full min-w-0 resize-none rounded-lg border border-foreground-third bg-transparent px-3 py-2 text-small text-foreground transition-colors outline-none placeholder:text-foreground-third focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
