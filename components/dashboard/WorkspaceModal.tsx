"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { userInfo, Workspace } from "@/types/userTypes";
import BasicsStep from "./workspaceModalSteps/BasicsStep";
import ScheduleStep from "./workspaceModalSteps/ScheduleStep";
import TeamStep from "./workspaceModalSteps/TeamStep";
import FeedbackStep from "./workspaceModalSteps/FeedbackStep";
import ReviewStep from "./workspaceModalSteps/ReviewStep";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import Stepper from "@/components/ui/Stepper";
import { XIcon } from "lucide-react";

export type WorkspaceModalMode =
    | { kind: "create" }
    | { kind: "edit"; workspace: Workspace; collaborators: userInfo[] };

type WorkspaceModalProps = {
    open: boolean;
    mode: WorkspaceModalMode;
    friends: userInfo[];
    onClose: () => void;
    onSubmitted: (workspace: Workspace, collaborators: userInfo[]) => void;
    onDeleted: (workspaceId: string) => void;
};

type FormData = {
    title: string;
    description: string;
    startTime: Date | null;
    collaborators: userInfo[];
    feedback: string;
};

type RawRoom = {
    id: string;
    title: string;
    description: string;
    user_ids: string[];
    host_id: string;
    start_time: string;
    last_activity_at?: string;
    lastActivity?: string;
    feedback?: string | null;
};

const STEPS = [
    { id: 1, label: "Basics" },
    { id: 2, label: "Schedule" },
    { id: 3, label: "Team" },
    { id: 4, label: "Feedback" },
    { id: 5, label: "Review" },
] as const;

const emptyForm: FormData = {
    title: "",
    description: "",
    startTime: null,
    collaborators: [],
    feedback: "",
};

const WorkspaceModal = ({
    open,
    mode,
    friends,
    onClose,
    onSubmitted,
    onDeleted,
}: WorkspaceModalProps) => {
    const { user } = useUser();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<FormData>(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setStep(1);
        setConfirmingDelete(false);

        if (mode.kind === "edit") {
            setForm({
                title: mode.workspace.title ?? "",
                description: mode.workspace.description ?? "",
                startTime: mode.workspace.startTime
                    ? new Date(mode.workspace.startTime)
                    : null,
                collaborators: mode.collaborators,
                feedback: mode.workspace.feedback ?? "",
            });
        } else {
            const ownerInfo: userInfo | null = user
                ? {
                      id: user.id,
                      firstName: user.firstName ?? "",
                      lastName: user.lastName ?? "",
                      imageUrl: user.imageUrl ?? "",
                      email:
                          user.primaryEmailAddress?.emailAddress ??
                          user.emailAddresses[0]?.emailAddress ??
                          "",
                  }
                : null;

            setForm({
                ...emptyForm,
                collaborators: ownerInfo ? [ownerInfo] : [],
            });
        }
    }, [open, mode, user]);

    if (!open) return null;

    const mapRawRoom = (raw: RawRoom): Workspace => ({
        id: raw.id,
        title: raw.title,
        description: raw.description,
        collaboratorIds: raw.user_ids,
        host: raw.host_id,
        startTime: raw.start_time,
        lastActivity: raw.last_activity_at ?? raw.lastActivity ?? "",
        feedback: raw.feedback ?? undefined,
    });

    const handleSubmit = async () => {
        if (!user || submitting) return;
        setSubmitting(true);

        const isCreate = mode.kind === "create";

        const body = {
            title: form.title,
            description: form.description,
            startTime: form.startTime ? form.startTime.toISOString() : null,
            collaborators: form.collaborators.map((c) => c.id),
            feedback: form.feedback,
        };

        const url = isCreate
            ? `${process.env.NEXT_PUBLIC_APP_URL}/api/workspaces`
            : `${process.env.NEXT_PUBLIC_APP_URL}/api/workspaces/${mode.workspace.id}`;

        try {
            const res = await fetch(url, {
                method: isCreate ? "POST" : "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                toast.error(
                    isCreate
                        ? "Failed to create workspace."
                        : "Failed to update workspace.",
                    { description: "Please try again." },
                );
                return;
            }

            const raw: RawRoom = await res.json();
            const mapped = mapRawRoom(raw);
            toast.success(
                isCreate ? "Workspace created." : "Workspace updated.",
            );
            onSubmitted(mapped, form.collaborators);
            onClose();
        } catch (err) {
            console.error(err);
            toast.error("Something went wrong.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (mode.kind !== "edit" || deleting) return;
        setDeleting(true);

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/workspaces/${mode.workspace.id}`,
                { method: "DELETE" },
            );

            if (!res.ok) {
                toast.error("Failed to delete workspace.", {
                    description: "Please try again.",
                });
                return;
            }

            toast.success("Workspace deleted.");
            onDeleted(mode.workspace.id);
            onClose();
        } catch (err) {
            console.error(err);
            toast.error("Something went wrong.");
        } finally {
            setDeleting(false);
        }
    };

    const isFinalStep = step === STEPS.length;
    const isFirstStep = step === 1;

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent
                showCloseButton={false}
                mobileFullScreen
                className="lg:h-[80dvh]"
                // Portaled to the body, but synthetic events bubble along the
                // React tree, so a click here would reach the row's onClick.
                onClick={(e) => e.stopPropagation()}
            >
                {/* flex-wrap so the delete-confirmation cluster drops to its
                    own line rather than overflowing when the title and it
                    together exceed a phone's width. */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <DialogTitle>
                        {mode.kind === "create"
                            ? "Create workspace"
                            : "Edit workspace"}
                    </DialogTitle>
                    <div className="flex items-center gap-2 lg:gap-4">
                        {mode.kind === "edit" &&
                            (confirmingDelete ? (
                                <div className="flex items-center gap-1 text-caption">
                                    <span className="text-foreground-third">
                                        Delete this workspace?
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="text-red-500 font-inter-bold hover:text-red-600"
                                    >
                                        {deleting ? "Deleting..." : "Delete"}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            setConfirmingDelete(false)
                                        }
                                        disabled={deleting}
                                        className="text-foreground-third hover:text-foreground"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setConfirmingDelete(true)}
                                    className="text-red-500 hover:text-red-600"
                                >
                                    Delete
                                </Button>
                            ))}
                        <DialogClose asChild>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Close"
                                className="text-foreground-third hover:text-foreground"
                            >
                                <XIcon />
                            </Button>
                        </DialogClose>
                    </div>
                </div>

                <Stepper
                    steps={[...STEPS]}
                    current={step}
                    onStepChange={setStep}
                />

                {/*  `-m-1 p-1` rather than a bare `pr-1`: overflow-y-auto makes
                    overflow-x compute to auto as well (the spec resolves a
                    `visible` axis to `auto` when the other axis isn't), so this
                    clips on every side, not just vertically. A w-full field sits
                    flush against the content edge and its focus-visible ring-3 —
                    a box-shadow 3px outside the border box — was being sliced
                    off. The padding gives the ring room and the matching
                    negative margin pulls the box back so nothing shifts. Same
                    idiom as SheetBody. */}
                <div className="flex-1 min-h-80 overflow-y-auto -m-1 p-1">
                    {step === 1 && (
                        <BasicsStep
                            title={form.title}
                            description={form.description}
                            onTitleChange={(title) =>
                                setForm((p) => ({ ...p, title }))
                            }
                            onDescriptionChange={(description) =>
                                setForm((p) => ({ ...p, description }))
                            }
                        />
                    )}
                    {step === 2 && (
                        <ScheduleStep
                            value={form.startTime}
                            onChange={(startTime) =>
                                setForm((p) => ({ ...p, startTime }))
                            }
                        />
                    )}
                    {step === 3 && (
                        <TeamStep
                            collaborators={form.collaborators}
                            friends={friends}
                            onChange={(collaborators) =>
                                setForm((p) => ({ ...p, collaborators }))
                            }
                        />
                    )}
                    {step === 4 && (
                        <FeedbackStep
                            feedback={form.feedback}
                            onChange={(feedback) =>
                                setForm((p) => ({ ...p, feedback }))
                            }
                        />
                    )}
                    {step === 5 && (
                        <ReviewStep
                            title={form.title}
                            description={form.description}
                            startTime={form.startTime}
                            collaborators={form.collaborators}
                            feedback={form.feedback}
                        />
                    )}
                </div>

                {/* pb-safe with no --safe-pb adds nothing but the device's
                    bottom inset, which is exactly what these buttons need when
                    the dialog is full-screen and they sit on the viewport
                    edge. It resolves to zero everywhere else. */}
                <div className="flex items-center justify-between pb-safe">
                    <Button
                        onClick={() => setStep((s) => Math.max(1, s - 1))}
                        disabled={isFirstStep}
                    >
                        Back
                    </Button>
                    {isFinalStep ? (
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting
                                ? "Saving..."
                                : mode.kind === "create"
                                  ? "Create"
                                  : "Save"}
                        </Button>
                    ) : (
                        <Button
                            onClick={() =>
                                setStep((s) => Math.min(STEPS.length, s + 1))
                            }
                        >
                            Next
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default WorkspaceModal;
