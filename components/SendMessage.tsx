"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Button from "@/components/dashboard/Button";

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

const inputClass =
    "border border-foreground-third rounded-md py-2 px-3 text-small placeholder:text-foreground-third focus:outline-none bg-transparent text-foreground";

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
                            <div className="flex flex-col gap-2 flex-1">
                                <label
                                    htmlFor="send-firstname"
                                    className={labelClass}
                                >
                                    FIRST NAME
                                </label>
                                <input
                                    id="send-firstname"
                                    type="text"
                                    value={firstName}
                                    onChange={(e) =>
                                        setFirstName(e.target.value)
                                    }
                                    placeholder="John"
                                    className={inputClass}
                                />
                            </div>
                            <div className="flex flex-col gap-2 flex-1">
                                <label
                                    htmlFor="send-lastname"
                                    className={labelClass}
                                >
                                    LAST NAME
                                </label>
                                <input
                                    id="send-lastname"
                                    type="text"
                                    value={lastName}
                                    onChange={(e) =>
                                        setLastName(e.target.value)
                                    }
                                    placeholder="Doe"
                                    className={inputClass}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label htmlFor="send-email" className={labelClass}>
                                EMAIL
                            </label>
                            <input
                                id="send-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="john@email.com"
                                className={inputClass}
                            />
                        </div>
                    </div>
                );
            }
            if (step === 2) {
                return (
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <label
                                htmlFor="send-usecase"
                                className={labelClass}
                            >
                                HOW WOULD YOU USE CHALKIE CHALKIE?
                            </label>
                            <textarea
                                id="send-usecase"
                                value={useCase}
                                onChange={(e) => setUseCase(e.target.value)}
                                placeholder="Tell us about your use case..."
                                rows={5}
                                className={`${inputClass} resize-none`}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label
                                htmlFor="send-referral"
                                className={labelClass}
                            >
                                HOW WERE YOU REFERRED TO US?
                            </label>
                            <textarea
                                id="send-referral"
                                value={referral}
                                onChange={(e) => setReferral(e.target.value)}
                                placeholder="Where did you hear about Chalkie Chalkie..."
                                rows={3}
                                className={`${inputClass} resize-none`}
                            />
                        </div>
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
                    <div className="flex flex-col gap-2">
                        <label htmlFor="send-email" className={labelClass}>
                            EMAIL
                        </label>
                        <input
                            id="send-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="john@email.com"
                            className={inputClass}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="send-summary" className={labelClass}>
                            SUMMARY
                        </label>
                        <input
                            id="send-summary"
                            type="text"
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            placeholder="One line summary of the issue"
                            className={inputClass}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="send-severity" className={labelClass}>
                            ISSUE SEVERITY
                        </label>
                        <select
                            id="send-severity"
                            value={severity}
                            onChange={(e) =>
                                setSeverity(e.target.value as SeverityType)
                            }
                            className={inputClass}
                        >
                            {SeverityOptions.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            );
        }
        if (step === 2) {
            return (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="send-reproduce" className={labelClass}>
                            STEPS TO REPRODUCE
                        </label>
                        <textarea
                            id="send-reproduce"
                            value={reproduceSteps}
                            onChange={(e) => setReproduceSteps(e.target.value)}
                            placeholder="Go to ... and click ..."
                            rows={5}
                            className={`${inputClass} resize-none`}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="send-expected" className={labelClass}>
                            EXPECTED VS ACTUAL BEHAVIOUR
                        </label>
                        <textarea
                            id="send-expected"
                            value={expectedVsActual}
                            onChange={(e) =>
                                setExpectedVsActual(e.target.value)
                            }
                            placeholder="Expected... Actual..."
                            rows={5}
                            className={`${inputClass} resize-none`}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="send-browser" className={labelClass}>
                            BROWSER AND OS
                        </label>
                        <input
                            id="send-browser"
                            type="text"
                            value={browserAndOS}
                            onChange={(e) => setBrowserAndOS(e.target.value)}
                            placeholder="e.g. Chrome 124 on macOS 14"
                            className={inputClass}
                        />
                    </div>
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
        <div
            onClick={onClose}
            className="fixed left-0 top-0 w-full h-full bg-background/80 z-1000 flex items-center justify-center"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-card-background rounded-xl p-8 w-150 max-w-[92vw] h-[70dvh] 2xl:h-[60dvh] flex flex-col gap-6 text-foreground"
            >
                <div className="flex items-center justify-between">
                    <div className="text-subheading">{headerTitle}</div>
                    <button
                        onClick={onClose}
                        className="text-foreground-third hover:text-foreground text-subheading leading-none cursor-pointer"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="flex items-center justify-between px-2">
                    {steps.map((s, i) => (
                        <React.Fragment key={s.id}>
                            <button
                                onClick={() => {
                                    if (canJumpTo(s.id)) setStep(s.id);
                                }}
                                disabled={!canJumpTo(s.id)}
                                className={cn(
                                    "flex flex-col items-center gap-1",
                                    canJumpTo(s.id)
                                        ? "cursor-pointer"
                                        : "cursor-not-allowed",
                                )}
                            >
                                <div
                                    className={cn(
                                        "w-7 h-7 rounded-full flex items-center justify-center text-caption font-inter-bold transition-colors",
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
                                        "text-caption",
                                        step === s.id
                                            ? "text-foreground"
                                            : "text-foreground-third",
                                    )}
                                >
                                    {s.label}
                                </div>
                            </button>
                            {i < steps.length - 1 && (
                                <div className="flex-1 h-px bg-foreground-third mx-2 -mt-4" />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                    {renderBody()}
                </div>

                <div className="flex items-center justify-between">
                    <Button
                        text="Back"
                        onClick={() => setStep((s) => Math.max(1, s - 1))}
                        disabled={isFirstStep}
                    />
                    {isFinalStep ? (
                        <Button
                            text={isSubmitting ? "Sending..." : "Submit"}
                            onClick={handleSubmit}
                            disabled={isSubmitting || !allValid}
                        />
                    ) : (
                        <Button
                            text="Next"
                            onClick={() =>
                                setStep((s) => Math.min(steps.length, s + 1))
                            }
                            disabled={!canAdvance}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default SendMessage;
