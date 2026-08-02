"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

/*  Restyled to the hand-rolled modal this replaces: `bg-background/80` scrim
    over a `bg-card` panel at surface rounding with p-8 and gap-6.

    What Radix adds over the old backdrop divs, all of it previously absent:
    Escape to close, focus trap, scroll lock, and the aria-modal/labelling
    wiring. Sizing stays at the call site — pass a width class to
    DialogContent, as the old panels did. */

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-background/80 duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      // Dismiss-on-outside-click is Radix's own document-level pointerdown
      // listener, so it fires regardless. This stopPropagation is only about
      // React's synthetic tree: a portalled dialog is still a React child of
      // wherever it's rendered, so without it a click on the overlay bubbles
      // up to that ancestor's onClick — e.g. a table row's join-on-click.
      onClick={(e) => {
        onClick?.(e)
        e.stopPropagation()
      }}
      {...props}
    />
  )
}

/*  Below 2xl a centred panel leaves a phone's dialog cramped between the
    viewport edges and fighting the on-screen keyboard, so the multi-step
    dialogs fill the screen instead and restore the centred panel at 2xl.

    Every geometry class the centred default sets has to be undone explicitly
    — including `sm:max-w-150`, which would otherwise reassert a 600px cap from
    640px up and break the full-screen layout across most of its range. */
const MOBILE_FULL_SCREEN =
  "inset-0 h-full w-full max-w-none translate-x-0 translate-y-0 rounded-none p-6 sm:max-w-none 2xl:inset-auto 2xl:top-1/2 2xl:left-1/2 2xl:h-auto 2xl:w-full 2xl:max-w-150 2xl:-translate-x-1/2 2xl:-translate-y-1/2 2xl:rounded-xl 2xl:p-8"

function DialogContent({
  className,
  children,
  showCloseButton = true,
  mobileFullScreen = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  mobileFullScreen?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // border-foreground-third/15 matches the outer border on
          // WorkspaceTable's container, so the modal stands off the
          // background the same way the tables do.
          "fixed top-1/2 left-1/2 z-50 flex w-full max-w-[92vw] -translate-x-1/2 -translate-y-1/2 flex-col gap-6 rounded-xl border border-foreground-third/15 bg-card p-8 text-foreground duration-100 outline-none sm:max-w-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          mobileFullScreen && MOBILE_FULL_SCREEN,
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button
              variant="ghost"
              className="absolute top-6 right-6 text-foreground-third hover:text-foreground"
              size="icon-sm"
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-subheading", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-small text-foreground-third *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
