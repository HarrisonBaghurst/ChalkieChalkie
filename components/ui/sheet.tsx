"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

/*  Edge-anchored companion to Dialog. The mobile dashboard uses the `bottom`
    side: a workspace or connection row taps open into one of these instead of
    the centred modal a desktop pointer gets.

    Same Radix Dialog underneath, so Escape, focus trap, scroll lock and the
    aria-modal/labelling wiring all behave exactly as they do in dialog.tsx —
    this only changes where the panel sits and how it enters. Panel chrome
    matches Dialog's (bg-card, the same hairline border) but is rounded on the
    leading edge only, since the trailing edge meets the viewport.

    Height stays at the call site: the panel caps at 85dvh and the body
    between SheetHeader and SheetFooter is what scrolls. */

/*  Each side owns its own bottom padding rather than inheriting a `pb-*` from
    the base class string: the bottom panel needs `.pb-safe` to clear the iOS
    home indicator, and letting two padding utilities fight would leave the
    winner up to stylesheet order. */
const SIDE_CLASSES = {
  bottom:
    "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-xl border-t pb-safe [--safe-pb:1.5rem] data-open:slide-in-from-bottom data-closed:slide-out-to-bottom",
  top: "inset-x-0 top-0 max-h-[85dvh] rounded-b-xl border-b pb-6 data-open:slide-in-from-top data-closed:slide-out-to-top",
  left: "inset-y-0 left-0 h-full w-3/4 max-w-100 rounded-r-xl border-r pb-6 data-open:slide-in-from-left data-closed:slide-out-to-left",
  right:
    "inset-y-0 right-0 h-full w-3/4 max-w-100 rounded-l-xl border-l pb-6 data-open:slide-in-from-right data-closed:slide-out-to-right",
} as const

type SheetSide = keyof typeof SIDE_CLASSES

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetOverlay({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-background/80 duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      // Same React-tree guard dialog.tsx documents: the panel is portalled to
      // the body but is still a React child of the row that opened it, so
      // without this a click on the overlay bubbles to that row's onClick.
      onClick={(e) => {
        onClick?.(e)
        e.stopPropagation()
      }}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "bottom",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: SheetSide
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 flex flex-col gap-5 border-foreground-third/15 bg-card px-6 pt-6 text-foreground duration-200 outline-none data-open:animate-in data-closed:animate-out",
          SIDE_CLASSES[side],
          className
        )}
        {...props}
      >
        {side === "bottom" && (
          <div
            aria-hidden
            className="mx-auto -mt-2 h-1 w-10 shrink-0 rounded-full bg-foreground-third/40"
          />
        )}
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close data-slot="sheet-close" asChild>
            <Button
              variant="ghost"
              className="absolute top-5 right-5 text-foreground-third hover:text-foreground"
              size="icon-sm"
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </Button>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex shrink-0 flex-col gap-1 pr-10", className)}
      {...props}
    />
  )
}

// The scrolling middle. Negative inline margin lets scrolled content run to
// the panel's edges while its own padding keeps the text off them.
function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn("-mx-6 flex-1 overflow-y-auto px-6", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("flex shrink-0 flex-col gap-3", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-subheading", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-small text-foreground-third", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
}
