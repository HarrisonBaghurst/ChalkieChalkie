import * as React from "react"

import { cn } from "@/lib/utils"
import { fieldClasses, floatingLabelClasses } from "@/components/ui/input"

/*  Mirrors `Input` exactly — same class string with `resize-none` appended,
    baked in here rather than repeated at every call site, and the same
    floating label when `label` is passed. See the notes in input.tsx on
    `.control-surface`, the card-background-hover fill, why no `text-*`
    utility appears in this list, and how the label is driven.

    The one divergence: the resting label sits on the first text line rather
    than at the vertical centre. Centring is right for a single-line input,
    where the label is the only thing in the box until it floats — in a
    five-row textarea it would strand the label in open space. */
function Textarea({
  className,
  label,
  id,
  placeholder,
  ...props
}: React.ComponentProps<"textarea"> & { label?: string }) {
  const generatedId = React.useId()
  const textareaId = id ?? generatedId

  const field = (
    <textarea
      id={label ? textareaId : id}
      data-slot="textarea"
      placeholder={label ? placeholder || " " : placeholder}
      className={cn(fieldClasses(!!label), "flex resize-none", className)}
      {...props}
    />
  )

  if (!label) return field

  return (
    <div className="relative">
      {field}
      <label
        htmlFor={textareaId}
        className={cn(floatingLabelClasses, "top-6 translate-y-0")}
      >
        {label}
      </label>
    </div>
  )
}

export { Textarea }
