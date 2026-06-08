"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { cn } from "@/lib/utils";
import { userInfo, Workspace } from "@/types/userTypes";
import BasicsStep from "./workspaceModalSteps/BasicsStep";
import ScheduleStep from "./workspaceModalSteps/ScheduleStep";
import TeamStep from "./workspaceModalSteps/TeamStep";
import FeedbackStep from "./workspaceModalSteps/FeedbackStep";
import ReviewStep from "./workspaceModalSteps/ReviewStep";

export type WorkspaceModalMode =
    | { kind: "create" }
    | { kind: "edit"; workspace: Workspace; collaborators: userInfo[] };

type WorkspaceModalProps = {
    open: boolean;
    mode: WorkspaceModalMode;
    friends: userInfo[];
    onClose: () => void;
    onSubmitted: (workspace: Workspace, collaborators: userInfo[]) => void;
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
}: WorkspaceModalProps) => {
    const { user } = useUser();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<FormData>(emptyForm);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setStep(1);

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
        const roomId = isCreate ? uuidv4() : mode.workspace.id;

        const body = {
            roomId,
            title: form.title,
            description: form.description,
            startTime: form.startTime ? form.startTime.toISOString() : null,
            collaborators: form.collaborators.map((c) => c.id),
            feedback: form.feedback,
        };

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/workspaces/${roomId}`,
                {
                    method: isCreate ? "POST" : "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                },
            );

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

    const isFinalStep = step === STEPS.length;
    const isFirstStep = step === 1;

    return (
        <div
            onClick={onClose}
            className="fixed left-0 top-0 w-full h-full bg-background/80 z-500 flex items-center justify-center"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-card-background rounded-xl p-8 w-150 max-w-[92vw] h-[55dvh] flex flex-col gap-6 text-foreground"
            >
                <div className="flex items-center justify-between">
                    <div className="font-inter-bold text-base">
                        {mode.kind === "create"
                            ? "Create workspace"
                            : "Edit workspace"}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-foreground-third hover:text-foreground text-xl leading-none cursor-pointer"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="flex items-center justify-between px-2">
                    {STEPS.map((s, i) => (
                        <React.Fragment key={s.id}>
                            <button
                                onClick={() => setStep(s.id)}
                                className="flex flex-col items-center gap-1 cursor-pointer"
                            >
                                <div
                                    className={cn(
                                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-inter-bold transition-colors",
                                        step === s.id
                                            ? "bg-foreground text-background"
                                            : step > s.id
                                              ? "border border-foreground text-foreground"
                                              : "border border-foreground-third text-foreground-third",
                                    )}
                                >
                                    {s.id}
                                </div>
                                <div
                                    className={cn(
                                        "text-xs",
                                        step === s.id
                                            ? "text-foreground"
                                            : "text-foreground-third",
                                    )}
                                >
                                    {s.label}
                                </div>
                            </button>
                            {i < STEPS.length - 1 && (
                                <div className="flex-1 h-px bg-foreground-third mx-2 -mt-4" />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <div className="flex-1 min-h-80 overflow-y-auto pr-1">
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

                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setStep((s) => Math.max(1, s - 1))}
                        disabled={isFirstStep}
                        className={cn(
                            "text-background bg-foreground rounded-sm py-2 px-5 text-xs",
                            isFirstStep
                                ? "opacity-40 cursor-not-allowed"
                                : "cursor-pointer",
                        )}
                    >
                        Back
                    </button>
                    {isFinalStep ? (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className={cn(
                                "text-background bg-foreground rounded-sm py-2 px-5 text-xs",
                                submitting
                                    ? "opacity-40 cursor-not-allowed"
                                    : "cursor-pointer",
                            )}
                        >
                            {submitting
                                ? "Saving..."
                                : mode.kind === "create"
                                  ? "Create"
                                  : "Save"}
                        </button>
                    ) : (
                        <button
                            onClick={() =>
                                setStep((s) => Math.min(STEPS.length, s + 1))
                            }
                            className="text-background bg-foreground rounded-sm py-2 px-5 text-xs cursor-pointer"
                        >
                            Next
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorkspaceModal;
