"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import Stepper from "@/components/ui/Stepper";
import { FieldSpec, FormSpec, formFields } from "@/lib/forms/formSpec";
import { XIcon } from "lucide-react";

type StepperFormDialogProps = {
    spec: FormSpec;
    onClose: () => void;
};

const labelClass = "text-caption text-foreground-third";

const ReviewRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col gap-1">
        <div className={labelClass}>{label}</div>
        <div className="text-foreground whitespace-pre-wrap wrap-break-word">
            {value.trim() || "—"}
        </div>
    </div>
);

const seedValues = (spec: FormSpec): Record<string, string> =>
    Object.fromEntries(
        formFields(spec).map((field) => [
            field.key,
            field.kind === "select" ? (field.options?.[0] ?? "") : "",
        ]),
    );

const groupFields = (fields: readonly FieldSpec[]): FieldSpec[][] => {
    const groups: FieldSpec[][] = [];
    fields.forEach((field) => {
        const last = groups[groups.length - 1];
        if (field.half && last?.length === 1 && last[0].half) {
            last.push(field);
            return;
        }
        groups.push([field]);
    });
    return groups;
};

const StepperFormDialog = ({ spec, onClose }: StepperFormDialogProps) => {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [values, setValues] = useState(() => seedValues(spec));

    const reviewStep = spec.steps.length + 1;
    const steps = [
        ...spec.steps.map((s, i) => ({ id: i + 1, label: s.label })),
        { id: reviewStep, label: spec.reviewLabel ?? "Review" },
    ];

    const isFirstStep = step === 1;
    const isFinalStep = step === reviewStep;

    const setValue = (key: string, value: string) =>
        setValues((prev) => ({ ...prev, [key]: value }));

    const isStepValid = (target: number) => {
        const fieldStep = spec.steps[target - 1];
        if (!fieldStep) return true;
        return fieldStep.fields.every(
            (field) => field.optional || values[field.key].trim() !== "",
        );
    };

    const canAdvance = isStepValid(step);
    const allValid = spec.steps.every((_, i) => isStepValid(i + 1));

    const canJumpTo = (target: number) => {
        if (target <= step) return true;
        for (let s = 1; s < target; s++) {
            if (!isStepValid(s)) return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (isSubmitting || !allValid) return;
        setIsSubmitting(true);

        const body = formFields(spec)
            .map((field) => `${field.label}: ${values[field.key]}`)
            .join("\n");

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}${spec.endpoint}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: spec.subject, body }),
                },
            );
            if (!res.ok) {
                console.error(`Server error: ${res.status}`);
                toast.error("Error sending message. Please try again later.");
                return;
            }
            toast.success("Message sent successfully.", {
                description:
                    spec.successDescription ??
                    "We aim to respond within 2 business days.",
            });
            onClose();
        } catch {
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderField = (field: FieldSpec) => {
        const id = `form-${field.key}`;

        if (field.kind === "textarea") {
            return (
                <Textarea
                    id={id}
                    label={field.label}
                    value={values[field.key]}
                    onChange={(e) => setValue(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={field.rows ?? 4}
                />
            );
        }

        if (field.kind === "select") {
            return (
                <div className="flex flex-col gap-2">
                    <label htmlFor={id} className={labelClass}>
                        {field.label}
                    </label>
                    <Select
                        value={values[field.key]}
                        onValueChange={(value) => setValue(field.key, value)}
                    >
                        <SelectTrigger
                            id={id}
                            className="w-full bg-card-background-hover hover:bg-card-background-hover"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {field.options?.map((option) => (
                                <SelectItem key={option} value={option}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            );
        }

        return (
            <Input
                id={id}
                type={field.type ?? "text"}
                label={field.label}
                value={values[field.key]}
                onChange={(e) => setValue(field.key, e.target.value)}
                placeholder={field.placeholder}
            />
        );
    };

    const renderNote = () => {
        if (!spec.note) return null;
        return (
            <p className="text-caption text-foreground-third pt-2">
                {spec.note.text}
                {spec.note.link && (
                    <a className="text-[#1a73e8]" href={spec.note.link.href}>
                        {spec.note.link.label}
                    </a>
                )}
                {spec.note.trailing}
            </p>
        );
    };

    const renderBody = () => {
        const fieldStep = spec.steps[step - 1];

        if (fieldStep) {
            return (
                <div className="flex flex-col gap-6">
                    {groupFields(fieldStep.fields).map((group) =>
                        group.length === 2 ? (
                            <div key={group[0].key} className="flex gap-4">
                                {group.map((field) => (
                                    <div key={field.key} className="flex-1">
                                        {renderField(field)}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div key={group[0].key}>
                                {renderField(group[0])}
                            </div>
                        ),
                    )}
                </div>
            );
        }

        return (
            <div className="flex flex-col gap-4">
                {formFields(spec).map((field) => (
                    <ReviewRow
                        key={field.key}
                        label={field.label}
                        value={values[field.key]}
                    />
                ))}
                {renderNote()}
            </div>
        );
    };

    return (
        <Dialog open onOpenChange={(next) => !next && onClose()}>
            <DialogContent
                showCloseButton={false}
                className="h-[70dvh] sm:max-w-150 2xl:h-[60dvh]"
            >
                <div className="flex items-center justify-between">
                    <DialogTitle>{spec.title}</DialogTitle>
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

                <Stepper
                    steps={steps}
                    current={step}
                    onStepChange={setStep}
                    canJumpTo={canJumpTo}
                />

                <div className="flex-1 min-h-0 overflow-y-auto -m-1 p-1">
                    {renderBody()}
                </div>

                <div className="flex items-center justify-between">
                    <Button
                        onClick={() => setStep((s) => Math.max(1, s - 1))}
                        disabled={isFirstStep}
                    >
                        Back
                    </Button>
                    {isFinalStep ? (
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !allValid}
                        >
                            {isSubmitting ? "Sending..." : "Submit"}
                        </Button>
                    ) : (
                        <Button
                            onClick={() =>
                                setStep((s) => Math.min(reviewStep, s + 1))
                            }
                            disabled={!canAdvance}
                        >
                            Next
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default StepperFormDialog;
