"use client";

import { useState } from "react";
import { toast } from "sonner";
import { EllipsisIcon, PencilIcon, TrashIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Sheet,
    SheetBody,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    Popover,
    PopoverContent,
    PopoverDescription,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Avatar,
    AvatarFallback,
    AvatarGroup,
    AvatarGroupCount,
} from "@/components/ui/avatar";
import Skeleton from "@/components/ui/Skeleton";
import Spinner from "@/components/ui/Spinner";
import Stepper from "@/components/ui/Stepper";
import RowActionsMenu from "@/components/dashboard/RowActionsMenu";
import TapTooltip from "@/components/TapTooltip";
import InviteCountdown from "@/components/dashboard/connections/InviteCountdown";
import { Block, Caption, Code, Note, Section } from "../primitives";

const STEPS = [
    { id: 1, label: "Basics" },
    { id: 2, label: "Schedule" },
    { id: 3, label: "Team" },
    { id: 4, label: "Review" },
];

const Item = ({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) => (
    <div className="flex flex-col items-start gap-2">
        {children}
        <Caption>{label}</Caption>
    </div>
);

const Components = () => {
    const [step, setStep] = useState(2);

    // Lazy initializer, so re-renders don't restart the ticking specimens.
    const [inviteNow] = useState(() => Date.now());

    return (
        <Section
            id="components"
            title="Components"
            intro={
                <>
                    Shared primitives live in <Code>components/ui</Code>. They
                    are shadcn components (registry style{" "}
                    <Code>radix-nova</Code>, see <Code>components.json</Code>)
                    that have been restyled onto the tokens above. Compose these
                    before hand-rolling anything — a one-off <Code>button</Code>{" "}
                    with its own classes is the main way this system drifts.
                </>
            }
        >
            <Block
                title="Button"
                description="Seven variants. default is the canonical primary action — white fill, dark label — and there should be at most one per view. secondary and outline are for supporting actions, ghost for icon buttons and toolbar chrome, link for inline navigation."
            >
                <div className="flex flex-col gap-8">
                    <div className="flex flex-wrap items-center gap-4">
                        <Item label="default">
                            <Button>Create workspace</Button>
                        </Item>
                        <Item label="secondary">
                            <Button variant="secondary">Cancel</Button>
                        </Item>
                        <Item label="outline">
                            <Button variant="outline">Filter</Button>
                        </Item>
                        <Item label="ghost">
                            <Button variant="ghost">Skip</Button>
                        </Item>
                        <Item label="destructive">
                            <Button variant="destructive">Delete</Button>
                        </Item>
                        <Item label="success">
                            <Button variant="success">Confirm</Button>
                        </Item>
                        <Item label="link">
                            <Button variant="link">Learn more</Button>
                        </Item>
                        <Item label="disabled">
                            <Button disabled>Save</Button>
                        </Item>
                    </div>

                    <div className="flex flex-wrap items-end gap-4">
                        <Item label="xs">
                            <Button size="xs">Button</Button>
                        </Item>
                        <Item label="sm">
                            <Button size="sm">Button</Button>
                        </Item>
                        <Item label="default">
                            <Button>Button</Button>
                        </Item>
                        <Item label="lg">
                            <Button size="lg">Button</Button>
                        </Item>
                        <Item label="icon-sm">
                            <Button size="icon-sm" variant="ghost">
                                <PencilIcon />
                            </Button>
                        </Item>
                        <Item label="icon">
                            <Button size="icon" variant="outline">
                                <PencilIcon />
                            </Button>
                        </Item>
                        <Item label="icon-lg">
                            <Button size="icon-lg" variant="secondary">
                                <PencilIcon />
                            </Button>
                        </Item>
                    </div>

                    <Note>
                        Heights are intrinsic (<Code>h-fit</Code> plus padding),
                        so buttons grow with the type scale instead of clipping
                        at a fixed height. Size labels also step the type:{" "}
                        <Code>lg</Code> uses <Code>text-body</Code>, everything
                        smaller uses <Code>text-caption</Code>.
                    </Note>
                </div>
            </Block>

            <Block
                title="Badge"
                description="Small non-interactive labels. default is the filled info tag; status is the bare variant that supplies its own coloured dot as a child."
            >
                <div className="flex flex-wrap items-center gap-4">
                    <Item label="default">
                        <Badge>Host</Badge>
                    </Item>
                    <Item label="status">
                        <Badge variant="status">
                            <span className="size-2 rounded-full bg-success" />
                            Scheduled
                        </Badge>
                    </Item>
                    <Item label="secondary">
                        <Badge variant="secondary">Draft</Badge>
                    </Item>
                    <Item label="outline">
                        <Badge variant="outline">Beta</Badge>
                    </Item>
                    <Item label="destructive">
                        <Badge variant="destructive">Cancelled</Badge>
                    </Item>
                    <Item label="success">
                        <Badge variant="success">Complete</Badge>
                    </Item>
                </div>
            </Block>

            <Block
                title="Form controls"
                description="Input and Textarea share one class string, built on .control-surface — a card-background-hover fill (a tier lighter than the card/modal surface they usually sit on), a faint foreground-third hairline border, text-small. Both carry the focus-visible ring; never remove it with focus:outline-none, which is what the hand-rolled inputs these replaced did."
            >
                <div className="flex max-w-md flex-col gap-5">
                    <Input placeholder="Search sessions..." />
                    <Input placeholder="Invalid value" aria-invalid />
                    <Input placeholder="Disabled" disabled />
                    <Textarea placeholder="Lesson description" rows={3} />
                    <Select>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a subject" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="maths">Maths</SelectItem>
                            <SelectItem value="physics">Physics</SelectItem>
                            <SelectItem value="chemistry">Chemistry</SelectItem>
                        </SelectContent>
                    </Select>
                    <label className="flex cursor-pointer items-center gap-3">
                        <Checkbox defaultChecked />
                        <span className="text-small text-foreground-second">
                            Notify collaborators
                        </span>
                    </label>
                </div>
            </Block>

            <Block
                title="Floating labels"
                description="Passing `label` to Input or Textarea replaces the caption-above-the-field pattern: the label rests where the value will appear, then rises and shrinks on focus, or whenever the field holds a value. The placeholder demotes to an example that only fades in once focused, so a field shows one string at a time. Click into these to see it — the second is pre-filled, so its label starts floated. Padding goes to pt-6 pb-2 to make room; a field given no label has nothing to raise and stays exactly as the row above, which is what leaves the search box and DateTimePicker's hh:mm boxes untouched."
            >
                <div className="flex max-w-md flex-col gap-5">
                    <Input label="Title" placeholder="e.g. Maths tutoring" />
                    <Input
                        label="Email"
                        type="email"
                        defaultValue="john@email.com"
                    />
                    <Input label="Invalid value" aria-invalid />
                    <Input label="Disabled" disabled />
                    <Textarea
                        label="Description"
                        placeholder="What is this workspace for?"
                        rows={3}
                    />
                </div>
            </Block>

            <Block
                title="Calendar"
                description="shadcn's calendar (react-day-picker), restyled onto the tokens: type scale instead of text-sm/text-xs, radius-tag cells, a transparent root so it sits on whatever surface hosts it, and the selected day on bg-primary — the same white pill as the primary button. Weeks start Monday and weekday headers are two letters, app-wide. Arrow keys move between days, PageUp/PageDown between months. Pair it with two Selects for time, as DateTimePicker does; shadcn ships no date-time picker."
            >
                <Calendar mode="single" defaultMonth={new Date()} />
            </Block>

            <Block
                title="Tabs"
                description="A control-surface track with a filled active pill. The line variant swaps the pill for an underline. Radix supplies arrow-key roving focus, which the hand-rolled button rows never had."
            >
                <div className="flex flex-col gap-8">
                    <Tabs defaultValue="upcoming">
                        <TabsList>
                            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                            <TabsTrigger value="past">Past</TabsTrigger>
                        </TabsList>
                        <TabsContent value="upcoming">
                            <p className="text-small text-foreground-third">
                                Default variant.
                            </p>
                        </TabsContent>
                        <TabsContent value="past">
                            <p className="text-small text-foreground-third">
                                Default variant.
                            </p>
                        </TabsContent>
                    </Tabs>

                    <Tabs defaultValue="a">
                        <TabsList variant="line">
                            <TabsTrigger value="a">Overview</TabsTrigger>
                            <TabsTrigger value="b">Activity</TabsTrigger>
                        </TabsList>
                        <TabsContent value="a">
                            <p className="text-small text-foreground-third">
                                line variant.
                            </p>
                        </TabsContent>
                        <TabsContent value="b">
                            <p className="text-small text-foreground-third">
                                line variant.
                            </p>
                        </TabsContent>
                    </Tabs>
                </div>
            </Block>

            <Block
                title="Overlays"
                description="All Radix-backed, so they bring focus trapping, Escape-to-close, scroll lock and the aria wiring for free. Never rebuild a modal out of fixed divs."
            >
                <div className="flex flex-wrap items-center gap-4">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline">Open dialog</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Delete workspace</DialogTitle>
                                <DialogDescription>
                                    This removes the board, its strokes and every
                                    pasted image. It cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter showCloseButton>
                                <Button variant="destructive">Delete</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <EllipsisIcon />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem>
                                <PencilIcon />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive">
                                <TrashIcon />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline">Open popover</Button>
                        </PopoverTrigger>
                        <PopoverContent>
                            <PopoverHeader>
                                <PopoverTitle>Collaborators</PopoverTitle>
                                <PopoverDescription>
                                    Everyone invited to this workspace.
                                </PopoverDescription>
                            </PopoverHeader>
                        </PopoverContent>
                    </Popover>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="secondary">Hover for tooltip</Button>
                        </TooltipTrigger>
                        <TooltipContent>Inverted, caption-sized</TooltipContent>
                    </Tooltip>

                    <TapTooltip content="Opens on hover or on tap">
                        <Button variant="secondary">Hover or tap</Button>
                    </TapTooltip>

                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline">Open sheet</Button>
                        </SheetTrigger>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle>Algebra revision</SheetTitle>
                                <SheetDescription>
                                    Tuesday, 16:00
                                </SheetDescription>
                            </SheetHeader>
                            <SheetBody>
                                <p className="text-small text-foreground-second">
                                    The scrolling middle. Header and footer stay
                                    put; only this area moves.
                                </p>
                            </SheetBody>
                            <SheetFooter>
                                <Button size="lg">Primary action</Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>

                    <Button
                        variant="outline"
                        onClick={() =>
                            toast.success("Workspace saved", {
                                description: "Everyone in the room was updated.",
                            })
                        }
                    >
                        Fire a toast
                    </Button>
                </div>
                <Note tone="rule">
                    <Code>Tooltip</Code> opens on hover and focus only, so its
                    content is unreachable on a touch screen. When the tooltip
                    is the only way to read something —{" "}
                    <Code>PeopleStack</Code>, a truncated table cell — use{" "}
                    <Code>TapTooltip</Code> instead: same look, but a tap opens
                    it and a tap away closes it. Decorative labels naming an
                    action the trigger already performs can stay on{" "}
                    <Code>Tooltip</Code>.
                </Note>
                <Note tone="rule">
                    <Code>Sheet</Code> is Dialog anchored to an edge —{" "}
                    <Code>side=&quot;bottom&quot;</Code> by default, which is
                    what the mobile dashboard uses for a row&apos;s detail
                    panel. It caps at <Code>85dvh</Code> and scrolls inside{" "}
                    <Code>SheetBody</Code>. For a dialog that should fill a
                    phone&apos;s screen instead of centring, pass{" "}
                    <Code>mobileFullScreen</Code> to <Code>DialogContent</Code>:
                    full-bleed below <Code>lg</Code>, centred panel above it.
                </Note>
            </Block>

            <Block
                title="Row actions"
                description="Trailing three-dot menu for a table row (components/dashboard/RowActionsMenu). Takes a flat actions array — each with its own label, handler and optional destructive variant — rather than a bespoke onX prop per possible action, so a row can offer anything from a single Remove to a full Join/Edit set."
            >
                <div className="flex flex-wrap items-center gap-8">
                    <Item label="single action">
                        <RowActionsMenu
                            actions={[
                                {
                                    label: "Remove link",
                                    variant: "destructive",
                                    onSelect: () => {},
                                },
                            ]}
                        />
                    </Item>
                    <Item label="default + destructive">
                        <RowActionsMenu
                            actions={[
                                { label: "Edit workspace", onSelect: () => {} },
                                {
                                    label: "Delete workspace",
                                    variant: "destructive",
                                    onSelect: () => {},
                                },
                            ]}
                        />
                    </Item>
                </div>
            </Block>

            <Block
                title="Identity"
                description="Avatars are always circular and always ringed against the page. AvatarGroup overlaps them with a background-coloured ring; AvatarGroupCount closes an overflowing stack."
            >
                <div className="flex flex-wrap items-center gap-8">
                    <Item label="sm / default / lg">
                        <div className="flex items-center gap-3">
                            <Avatar size="sm">
                                <AvatarFallback>HB</AvatarFallback>
                            </Avatar>
                            <Avatar>
                                <AvatarFallback>HB</AvatarFallback>
                            </Avatar>
                            <Avatar size="lg">
                                <AvatarFallback>
                                    <UserIcon className="size-4" />
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </Item>
                    <Item label="AvatarGroup + count">
                        <AvatarGroup>
                            <Avatar>
                                <AvatarFallback>AS</AvatarFallback>
                            </Avatar>
                            <Avatar>
                                <AvatarFallback>JT</AvatarFallback>
                            </Avatar>
                            <Avatar>
                                <AvatarFallback>MR</AvatarFallback>
                            </Avatar>
                            <AvatarGroupCount>+3</AvatarGroupCount>
                        </AvatarGroup>
                    </Item>
                </div>
            </Block>

            <Block
                title="Invite code"
                description="The tutor↔student linking flow (app/dashboard/connections, components/dashboard/connections). A 6-character Crockford Base32 code, live for 10 minutes; InviteCountdown steps from text-foreground-second to text-destructive under a minute remaining, then to text-foreground-third once expired."
            >
                <div className="flex flex-wrap items-center gap-8">
                    <Item label="live, > 1 minute">
                        <div className="flex flex-col items-center gap-3 control-surface px-10 py-6">
                            <span className="text-heading font-inter-bold tracking-[0.3em]">
                                K3M9QF
                            </span>
                            <InviteCountdown
                                expiresAt={new Date(
                                    inviteNow + 5 * 60 * 1000,
                                ).toISOString()}
                            />
                        </div>
                    </Item>
                    <Item label="live, < 1 minute">
                        <div className="flex flex-col items-center gap-3 control-surface px-10 py-6">
                            <span className="text-heading font-inter-bold tracking-[0.3em]">
                                7RT2XB
                            </span>
                            <InviteCountdown
                                expiresAt={new Date(
                                    inviteNow + 45 * 1000,
                                ).toISOString()}
                            />
                        </div>
                    </Item>
                    <Item label="expired">
                        <div className="flex flex-col items-center gap-3 control-surface px-10 py-6 opacity-60">
                            <span className="text-heading font-inter-bold tracking-[0.3em]">
                                7RT2XB
                            </span>
                            <InviteCountdown
                                expiresAt={new Date(
                                    inviteNow - 1000,
                                ).toISOString()}
                            />
                        </div>
                    </Item>
                </div>
            </Block>

            <Block
                title="Loading"
                description="Skeletons for content whose shape is known, the spinner for waits with no shape to imply. Skeleton layouts share their column widths with the real table (lib/dashboardTableColumns.ts) so rows don't shift when data lands."
            >
                <div className="flex flex-wrap items-center gap-10">
                    <div className="flex w-64 flex-col gap-3">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-1/2" />
                        <Caption>Skeleton</Caption>
                    </div>
                    <Item label="Spinner">
                        <Spinner />
                    </Item>
                </div>
            </Block>

            <Block
                title="Stepper"
                description="Not a shadcn primitive — the registry has no stepper — but it lives in components/ui because it is the same kind of shared, restyle-in-one-place component. Used by the workspace modal and the contact flow; canJumpTo gates which steps are reachable."
            >
                <Stepper
                    steps={STEPS}
                    current={step}
                    onStepChange={setStep}
                    className="max-w-xl"
                />
            </Block>
        </Section>
    );
};

export default Components;
