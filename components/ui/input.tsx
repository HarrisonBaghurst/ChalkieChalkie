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
const baseClasses =
  "control-surface bg-card-background-hover w-full min-w-0 px-3 text-small text-foreground transition-colors outline-none file:inline-flex file:border-0 file:bg-transparent file:text-foreground placeholder:text-foreground-third focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"

/*  ── Floating label ──────────────────────────────────────────────────────
    Passing `label` turns the field into a floating-label input: the label
    rests where the value will appear, then rises and shrinks on focus (or
    whenever the field is non-empty, so it never lands back on top of text).
    The `placeholder` becomes an example that only fades in once focused, so
    a field shows one string at a time instead of a caption above plus a
    prompt inside.

    A field given no `label` has nothing to raise, so it renders exactly as
    before — plain, and at the original `py-2`. That is what keeps
    DateTimePicker's fixed-height hh:mm boxes and the search field intact;
    it is a consequence of there being no label, not an opt-out.

    Vertical padding is deliberately absent from `baseClasses` and chosen
    here instead. Appending `pt-6 pb-2` to a string already holding `py-2`
    leaves both in place — tailwind-merge won't drop a shorthand for two
    longhands — and which one wins is then down to Tailwind's internal sort
    order rather than anything this file states.

    Three more things are load-bearing:

    - The state is driven by `:placeholder-shown`, not React, so it is
      correct for uncontrolled inputs too. That CSS state only exists while
      a placeholder attribute is set, hence the `" "` fallback — a labelled
      field with no example would otherwise read as permanently filled and
      the label would never drop.
    - The label must follow the input in DOM order: `peer-*` compiles to the
      `~` sibling combinator, which only looks forwards.
    - The size change is `scale`, not a swap to `text-caption`. The type
      scale lives in `@layer components`, so Tailwind generates no
      `peer-focus:text-caption` variant of it — and a transform animates
      where a font-size swap would jump. 0.85 × text-small lands on
      text-caption's size.

    The transition names `translate` and `scale`, not `transform`: v4
    compiles those utilities to the standalone CSS properties of the same
    name, so a `transition-property: transform` matches nothing and the
    label teleports instead of rising. */
function fieldClasses(hasLabel: boolean) {
  return cn(
    baseClasses,
    hasLabel
      ? "peer pt-6 pb-2 placeholder:opacity-0 placeholder:transition-opacity placeholder:duration-150 placeholder:ease-in-out focus:placeholder:opacity-100"
      : "py-2"
  )
}

const floatingLabelClasses =
  "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 origin-left select-none text-small text-foreground-third transition-[top,translate,scale,color] duration-150 ease-in-out peer-focus:top-1.5 peer-focus:translate-y-0 peer-focus:scale-[0.85] peer-focus:text-foreground-second peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:scale-[0.85] peer-aria-invalid:text-destructive peer-disabled:opacity-40"

type InputProps = React.ComponentProps<"input"> & {
  /** Field name. Supplying it switches on the floating-label treatment. */
  label?: string
}

function Input({
  className,
  type,
  label,
  id,
  placeholder,
  ...props
}: InputProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId

  const field = (
    <input
      type={type}
      id={label ? inputId : id}
      data-slot="input"
      placeholder={label ? placeholder || " " : placeholder}
      className={cn(fieldClasses(!!label), className)}
      {...props}
    />
  )

  if (!label) return field

  return (
    <div className="relative">
      {field}
      <label htmlFor={inputId} className={floatingLabelClasses}>
        {label}
      </label>
    </div>
  )
}

export { Input, fieldClasses, floatingLabelClasses }
