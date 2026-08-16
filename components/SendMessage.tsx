"use client";

import React, { useState } from "react";
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
import { XIcon } from "lucide-react";

type SendMessageMode = "beta" | "contact";

type SendMessageProps = {
    mode: SendMessageMode;
    onClose: () => void;
};

type SeverityType =
    | "Low"
    | "Medium"
    | "High - Blocks usage"
    | "Critical - Data loss";

const SeverityOptions: SeverityType[] = [
    "Low",
    "Medium",
    "High - Blocks usage",
    "Critical - Data loss",
];

const labelClass = "text-caption text-foreground-third";

const BETA_STEPS = [
    { id: 1, label: "About you" },
    { id: 2, label: "Your interest" },
    { id: 3, label: "Review" },
] as const;

const CONTACT_STEPS = [
    { id: 1, label: "Overview" },
    { id: 2, label: "Details" },
    { id: 3, label: "Review" },
] as const;

const ReviewRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col gap-1">
        <div className={labelClass}>{label.toUpperCase()}</div>
        <div className="text-foreground whitespace-pre-wrap wrap-break-word">
            {value.trim() || "—"}
        </div>
    </div>
);

const SendMessage = ({ mode, onClose }: SendMessageProps) => {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [email, setEmail] = useState("");

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [useCase, setUseCase] = useState("");
    const [referral, setReferral] = useState("");

    const [summary, setSummary] = useState("");
    const [severity, setSeverity] = useState<SeverityType>("Low");
    const [reproduceSteps, setReproduceSteps] = useState("");
    const [expectedVsActual, setExpectedVsActual] = useState("");
    const [browserAndOS, setBrowserAndOS] = useState("");

    const steps = mode === "beta" ? BETA_STEPS : CONTACT_STEPS;
    const isFirstStep = step === 1;
    const isFinalStep = step === steps.length;

    const isStepValid = (s: number) => {
        if (mode === "beta") {
            if (s === 1)
                return (
                    firstName.trim() !== "" &&
                    lastName.trim() !== "" &&
                    email.trim() !== ""
                );
            if (s === 2) return useCase.trim() !== "" && referral.trim() !== "";
            return true;
        }
        if (s === 1) return email.trim() !== "" && summary.trim() !== "";
        if (s === 2)
            return (
                reproduceSteps.trim() !== "" &&
                expectedVsActual.trim() !== "" &&
                browserAndOS.trim() !== ""
            );
        return true;
    };

    const canAdvance = isStepValid(step);
    const allValid = isStepValid(1) && isStepValid(2);

    const canJumpTo = (target: number) => {
        if (target <= step) return true;
        for (let s = 1; s < target; s++) {
            if (!isStepValid(s)) return false;
        }
        return true;
    };

    const headerTitle =
        mode === "beta" ? "Join the private beta" : "Contact Chalkie Chalkie";

    const handleSubmit = async () => {
        if (isSubmitting || !allValid) return;
        setIsSubmitting(true);

        const submitTitle =
            mode === "beta" ? "Early Access Request" : "Bug Report ";

        const body =
            mode === "beta"
                ? `Name: ${firstName} ${lastName}\nEmail: ${email}\nUse Case: ${useCase}\nReferral: ${referral}`
                : `Email: ${email}\nSummary: ${summary}\nSeverity: ${severity}\nSteps to Reproduce: ${reproduceSteps}\nExpected vs Actual: ${expectedVsActual}\nBrowser & OS: ${browserAndOS}`;

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/contact`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: submitTitle, body }),
                },
            );
            if (!res.ok) {
                console.error(`Server error: ${res.status}`);
                toast.error("Error sending message. Please try again later.");
                return;
            }
            toast.success("Message sent successfully.", {
                description: "We aim to respond within 2 business days.",
            });
            onClose();
        } catch {
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderBody = () => {
        if (mode === "beta") {
            if (step === 1) {
                return (
                    <div className="flex flex-col gap-6">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <Input
                                    id="send-firstname"
                                    type="text"
                                    label="First name"
                                    value={firstName}
                                    onChange={(e) =>
                                        setFirstName(e.target.value)
                                    }
                                    placeholder="John"
                                />
                            </div>
                            <div className="flex-1">
                                <Input
                                    id="send-lastname"
                                    type="text"
                                    label="Last name"
                                    value={lastName}
                                    onChange={(e) =>
                                        setLastName(e.target.value)
                                    }
                                    placeholder="Doe"
                                />
                            </div>
                        </div>
                        <Input
                            id="send-email"
                            type="email"
                            label="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="john@email.com"
                        />
                    </div>
                );
            }
            if (step === 2) {
                return (
                    <div className="flex flex-col gap-6">
                        <Textarea
                            id="send-usecase"
                            label="How would you use Chalkie Chalkie?"
                            value={useCase}
                            onChange={(e) => setUseCase(e.target.value)}
                            placeholder="Tell us about your use case..."
                            rows={5}
                        />
                        <Textarea
                            id="send-referral"
                            label="How were you referred to us?"
                            value={referral}
                            onChange={(e) => setReferral(e.target.value)}
                            placeholder="Where did you hear about Chalkie Chalkie..."
                            rows={3}
                        />
                    </div>
                );
            }
            return (
                <div className="flex flex-col gap-4">
                    <ReviewRow
                        label="Name"
                        value={`${firstName} ${lastName}`.trim()}
                    />
                    <ReviewRow label="Email" value={email} />
                    <ReviewRow label="Use case" value={useCase} />
                    <ReviewRow label="Referral" value={referral} />
                    <p className="text-caption text-foreground-third pt-2">
                        We are currently in private beta. All requests are
                        reviewed manually. You will be notified by email if you
                        are accepted.
                    </p>
                </div>
            );
        }

        if (step === 1) {
            return (
                <div className="flex flex-col gap-6">
                    <Input
                        id="send-email"
                        type="email"
                        label="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@email.com"
                    />
                    <Input
                        id="send-summary"
                        type="text"
                        label="Summary"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder="One line summary of the issue"
                    />
                    <div className="flex flex-col gap-2">
                        <label htmlFor="send-severity" className={labelClass}>
                            ISSUE SEVERITY
                        </label>
                        <Select
                            value={severity}
                            onValueChange={(value) =>
                                setSeverity(value as SeverityType)
                            }
                        >
                            <SelectTrigger
                                id="send-severity"
                                className="w-full"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {SeverityOptions.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {s}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            );
        }
        if (step === 2) {
            return (
                <div className="flex flex-col gap-6">
                    <Textarea
                        id="send-reproduce"
                        label="Steps to reproduce"
                        value={reproduceSteps}
                        onChange={(e) => setReproduceSteps(e.target.value)}
                        placeholder="Go to ... and click ..."
                        rows={5}
                    />
                    <Textarea
                        id="send-expected"
                        label="Expected vs actual behaviour"
                        value={expectedVsActual}
                        onChange={(e) => setExpectedVsActual(e.target.value)}
                        placeholder="Expected... Actual..."
                        rows={5}
                    />
                    <Input
                        id="send-browser"
                        type="text"
                        label="Browser and OS"
                        value={browserAndOS}
                        onChange={(e) => setBrowserAndOS(e.target.value)}
                        placeholder="e.g. Chrome 124 on macOS 14"
                    />
                </div>
            );
        }
        return (
            <div className="flex flex-col gap-4">
                <ReviewRow label="Email" value={email} />
                <ReviewRow label="Summary" value={summary} />
                <ReviewRow label="Severity" value={severity} />
                <ReviewRow label="Steps to reproduce" value={reproduceSteps} />
                <ReviewRow
                    label="Expected vs actual"
                    value={expectedVsActual}
                />
                <ReviewRow label="Browser and OS" value={browserAndOS} />
                <p className="text-caption text-foreground-third pt-2">
                    We are currently in private beta and expect issues to be
                    found. Current known issues can be found on{" "}
                    <a
                        className="text-[#1a73e8]"
                        href="https://github.com/HarrisonBaghurst/ChalkieChalkie/issues"
                    >
                        ChalkieChalkie&apos;s GitHub
                    </a>
                    .
                </p>
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
                    <DialogTitle>{headerTitle}</DialogTitle>
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
                    steps={[...steps]}
                    current={step}
                    onStepChange={setStep}
                    canJumpTo={canJumpTo}
                />

                {/* `-m-1 p-1` so the fields' focus ring isn't clipped — see the
                    note on the same container in WorkspaceModal. */}
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
                                setStep((s) => Math.min(steps.length, s + 1))
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

export default SendMessage;
