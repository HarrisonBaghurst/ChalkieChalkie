"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { OPTION_PANEL } from "@/components/dashboard/cardSurface";
import { LINK_CLASS } from "@/components/inlineMarkup";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    CEOP_URL,
    CONCERN_CATEGORIES,
    ConcernCategory,
    ConcernReportBody,
    MAX_CONCERN_DETAILS,
} from "@/lib/concernReport";
import { formatSessionTime } from "@/lib/textUtils";
import { getFullName, UNNAMED_USER } from "@/lib/userColour";

export type ReportMember = {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
};

type WorkspaceOption = {
    id: string;
    title: string | null;
    start_time: string | null;
};

type ReportConcernDialogProps = {
    open: boolean;
    onClose: () => void;
    workspaceId?: string;
    members?: ReportMember[];
    chooseWorkspace?: boolean;
};

const NONE = "none";

const labelClass = "text-caption text-foreground-third";

const triggerClass =
    "w-full bg-card-background-hover hover:bg-card-background-hover";

const ReportConcernDialog = ({
    open,
    onClose,
    workspaceId,
    members = [],
    chooseWorkspace = false,
}: ReportConcernDialogProps) => {
    const { isSignedIn, userId } = useAuth();
    const [category, setCategory] = useState<ConcernCategory>("behaviour");
    const [personId, setPersonId] = useState(NONE);
    const [chosenWorkspace, setChosenWorkspace] = useState(NONE);
    const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
    const [details, setDetails] = useState("");
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const others = members.filter((member) => member.id !== userId);
    const needsEmail = !isSignedIn;

    useEffect(() => {
        if (!open || !chooseWorkspace || !isSignedIn) return;
        let cancelled = false;

        const load = async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_APP_URL}/api/users/workspaces`,
                );
                if (!res.ok) return;
                const rows: WorkspaceOption[] = await res.json();
                if (!cancelled) setWorkspaces(rows);
            } catch {
                return;
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [open, chooseWorkspace, isSignedIn]);

    const reset = () => {
        setCategory("behaviour");
        setPersonId(NONE);
        setChosenWorkspace(NONE);
        setDetails("");
        setEmail("");
    };

    const close = () => {
        if (submitting) return;
        reset();
        onClose();
    };

    const trimmed = details.trim();
    const valid =
        trimmed.length > 0 &&
        trimmed.length <= MAX_CONCERN_DETAILS &&
        (!needsEmail || email.trim().length > 0);

    const submit = async () => {
        if (submitting || !valid) return;
        setSubmitting(true);

        const targetWorkspace =
            workspaceId ??
            (chosenWorkspace !== NONE ? chosenWorkspace : undefined);

        const body: ConcernReportBody = {
            category,
            details: trimmed,
            ...(targetWorkspace ? { workspaceId: targetWorkspace } : {}),
            ...(workspaceId && personId !== NONE
                ? { reportedUserId: personId }
                : {}),
            ...(needsEmail ? { email: email.trim() } : {}),
        };

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/report`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                },
            );

            if (!res.ok) {
                const { error } = (await res.json().catch(() => ({}))) as {
                    error?: string;
                };
                toast.error("Your report could not be sent.", {
                    description:
                        res.status === 429
                            ? "You have sent several reports recently. Please wait a little, or email us instead."
                            : (error ?? "Please try again."),
                });
                return;
            }

            toast.success("Report sent.", {
                description:
                    "Thank you for telling us. We will look into it and may contact you by email.",
            });
            reset();
            onClose();
        } catch {
            toast.error("Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && close()}>
            <DialogContent
                className="sm:max-w-150"
                onClick={(e) => e.stopPropagation()}
            >
                <DialogHeader>
                    <DialogTitle>Report a concern</DialogTitle>
                    <DialogDescription>
                        Tell us about anything on Chalkie Chalkie that worries
                        you. Your report goes to the Chalkie Chalkie team, not
                        to the person you are reporting.
                    </DialogDescription>
                </DialogHeader>

                <div className={OPTION_PANEL}>
                    <p className="text-small">
                        If someone is in immediate danger, call 999.
                    </p>
                    <p className="text-caption text-foreground-third">
                        You can also report online sexual abuse or grooming to{" "}
                        <a
                            href={CEOP_URL}
                            target="_blank"
                            rel="noreferrer noopener"
                            className={LINK_CLASS}
                        >
                            CEOP
                        </a>
                        , or talk to a trusted adult.
                    </p>
                </div>

                <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="report-category" className={labelClass}>
                            What is it about?
                        </label>
                        <Select
                            value={category}
                            onValueChange={(value) =>
                                setCategory(value as ConcernCategory)
                            }
                        >
                            <SelectTrigger
                                id="report-category"
                                className={triggerClass}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CONCERN_CATEGORIES.map((option) => (
                                    <SelectItem
                                        key={option.key}
                                        value={option.key}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {workspaceId && others.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <label
                                htmlFor="report-person"
                                className={labelClass}
                            >
                                Who is it about?
                            </label>
                            <Select value={personId} onValueChange={setPersonId}>
                                <SelectTrigger
                                    id="report-person"
                                    className={triggerClass}
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NONE}>
                                        Not about one person
                                    </SelectItem>
                                    {others.map((member) => (
                                        <SelectItem
                                            key={member.id}
                                            value={member.id}
                                        >
                                            {getFullName(member) ||
                                                UNNAMED_USER}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {!workspaceId && chooseWorkspace && workspaces.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <label
                                htmlFor="report-workspace"
                                className={labelClass}
                            >
                                Which lesson? (optional)
                            </label>
                            <Select
                                value={chosenWorkspace}
                                onValueChange={setChosenWorkspace}
                            >
                                <SelectTrigger
                                    id="report-workspace"
                                    className={triggerClass}
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NONE}>
                                        Not about a lesson
                                    </SelectItem>
                                    {workspaces.map((workspace) => (
                                        <SelectItem
                                            key={workspace.id}
                                            value={workspace.id}
                                        >
                                            {workspace.title ||
                                                "Untitled workspace"}
                                            {workspace.start_time &&
                                                ` · ${formatSessionTime(workspace.start_time)}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <Textarea
                        id="report-details"
                        label="What happened?"
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        placeholder="Tell us what happened, when, and who was involved."
                        rows={5}
                        maxLength={MAX_CONCERN_DETAILS}
                    />

                    {needsEmail && (
                        <Input
                            id="report-email"
                            type="email"
                            label="Your email address, so we can reply"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                        />
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        size="default"
                        disabled={submitting}
                        onClick={close}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="default"
                        size="default"
                        disabled={submitting || !valid}
                        onClick={submit}
                    >
                        {submitting ? "Sending..." : "Send report"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ReportConcernDialog;
