import { useState } from "react";
import Button from "./Button";
import TextInput from "./TextInput";

type MessageType = "early access" | "report a bug";
type SeverityType =
    | "Low"
    | "Medium"
    | "High - Blocks usage"
    | "Critical - Data loss";

const SeverityText: SeverityType[] = [
    "Low",
    "Medium",
    "High - Blocks usage",
    "Critical - Data loss",
];

const SendMessage = () => {
    const [messageType, setMessageType] = useState<MessageType>("early access");

    // handling submitions
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // shared fields
    const [email, setEmail] = useState<string>("");

    // early access fields
    const [firstName, setFirstName] = useState<string>("");
    const [lastName, setLastName] = useState<string>("");
    const [useCase, setUseCase] = useState<string>("");
    const [referral, setReferral] = useState<string>("");

    // bug report fields
    const [summary, setSummary] = useState<string>("");
    const [severity, setSeverity] = useState<SeverityType>("Low");
    const [reproduceSteps, setReproduceSteps] = useState<string>("");
    const [expectedVsActual, setExpectedVsActual] = useState<string>("");
    const [browserAndOS, setBrowserAndOS] = useState<string>("");

    const isEarlyAccessValid =
        firstName.trim() !== "" &&
        lastName.trim() !== "" &&
        email.trim() !== "" &&
        useCase.trim() !== "" &&
        referral.trim() !== "";

    const isBugReportValid =
        email.trim() !== "" &&
        summary.trim() !== "" &&
        reproduceSteps.trim() !== "" &&
        expectedVsActual.trim() !== "" &&
        browserAndOS.trim() !== "";

    const isFormValid =
        messageType === "early access" ? isEarlyAccessValid : isBugReportValid;

    const resetFields = () => {
        setEmail("");
        setFirstName("");
        setLastName("");
        setUseCase("");
        setReferral("");
        setSummary("");
        setSeverity("Low");
        setReproduceSteps("");
        setExpectedVsActual("");
        setBrowserAndOS("");
    };

    const handleSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        setSubmitError(null);

        const title =
            messageType === "early access"
                ? "Early Access Request"
                : "Bug Report ";

        const message =
            messageType === "early access"
                ? `Name: ${firstName} ${lastName}\nEmail: ${email}\nUse Case: ${useCase}\nReferral: ${referral}`
                : `Email: ${email}\nSummary: ${summary}\nSeverity: ${severity}\nSteps to Reproduce: ${reproduceSteps}\nExpected vs Actual: ${expectedVsActual}\nBrowser & OS: ${browserAndOS}`;

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/contact`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: title,
                        body: message,
                    }),
                },
            );
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            resetFields();
        } catch (err) {
            setSubmitError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong. Please try again.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-[40%] flex flex-col gap-8 card-style">
            <p className="text-sm text-foreground-third">CONTACT</p>
            <div className="flex flex-col gap-2">
                <p className="font-poppins-bold text-foreground text-3xl">
                    Send us a message
                </p>
                <p className="text-sm text-foreground-second">
                    We aim to respond within 2 business days
                </p>
            </div>
            <div className="grid grid-cols-2 gap-6">
                <Button
                    text="Request early access"
                    variant={
                        messageType === "early access" ? "primary" : "secondary"
                    }
                    handleClick={() => {
                        setMessageType("early access");
                    }}
                />
                <Button
                    text="Report a bug"
                    variant={
                        messageType === "report a bug" ? "primary" : "secondary"
                    }
                    handleClick={() => {
                        setMessageType("report a bug");
                    }}
                />
            </div>
            {messageType === "early access" ? (
                <div className="flex flex-col gap-8 pt-4">
                    <div className="flex gap-8">
                        <TextInput
                            title={"First Name"}
                            placeholder="John"
                            text={firstName}
                            onChange={setFirstName}
                            className="w-full"
                        />
                        <TextInput
                            title={"Last Name"}
                            placeholder="Doe"
                            text={lastName}
                            onChange={setLastName}
                            className="w-full"
                        />
                    </div>
                    <TextInput
                        title={"Email"}
                        placeholder="john@email.com"
                        text={email}
                        onChange={setEmail}
                        className="w-full"
                    />
                    <TextInput
                        title={"How would you use Chalkie Chalkie?"}
                        placeholder="Tell us about your use case..."
                        text={useCase}
                        onChange={setUseCase}
                        className="w-full"
                    />
                    <TextInput
                        title={"How were you referred to us?"}
                        placeholder="Where did you hear about Chalkie Chalkie..."
                        text={referral}
                        onChange={setReferral}
                        className="w-full"
                    />
                    <Button
                        text="Send message"
                        variant={"secondary"}
                        handleClick={handleSubmit}
                        clickable={isFormValid && !isSubmitting}
                    />
                    <p className="flex gap-4 text-xs text-foreground-third">
                        We are currently in private beta. All requests are
                        reviewed manually. You will be notified by email if you
                        are accepted.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-8 pt-4">
                    <TextInput
                        title={"Email"}
                        placeholder="john@email.com"
                        text={email}
                        onChange={setEmail}
                        className="w-full"
                    />
                    <TextInput
                        title={"Summary"}
                        placeholder="One line summary of the issue"
                        text={summary}
                        onChange={setSummary}
                        className="w-full"
                    />
                    <div className="flex flex-col gap-4">
                        <div className="text-sm text-foreground-third">
                            {"Issue severity"}
                        </div>
                        <div className="flex justify-between">
                            {SeverityText.map((text, i) => (
                                <Button
                                    key={i}
                                    text={text}
                                    handleClick={() => setSeverity(text)}
                                    size="small"
                                    variant={
                                        severity === text
                                            ? "primary"
                                            : "secondary"
                                    }
                                />
                            ))}
                        </div>
                    </div>
                    <TextInput
                        title={"Steps to reproduce"}
                        placeholder="Go to ... and click ..."
                        text={reproduceSteps}
                        onChange={setReproduceSteps}
                        className="w-full"
                    />
                    <TextInput
                        title={"Expected vs actual behaviour"}
                        placeholder="Expected... Actual..."
                        text={expectedVsActual}
                        onChange={setExpectedVsActual}
                        className="w-full"
                    />
                    <TextInput
                        title={"Browser and OS"}
                        placeholder="e.g. Chrome 124 on macOS 14"
                        text={browserAndOS}
                        onChange={setBrowserAndOS}
                        className="w-full"
                    />
                    <Button
                        text="Send report"
                        variant={"secondary"}
                        handleClick={handleSubmit}
                        clickable={isFormValid && !isSubmitting}
                    />
                    <p className="text-xs text-foreground-third">
                        We are currently in private beta and expect issues to be
                        found. Current known issues can be found on{" "}
                        <a
                            className={"text-[#1a73e8]"}
                            href="https://github.com/HarrisonBaghurst/ChalkieChalkie/issues"
                        >
                            ChalkieChalkie's GitHub
                        </a>
                        .
                    </p>
                </div>
            )}
        </div>
    );
};

export default SendMessage;
