import React from "react";
import { userInfo } from "@/types/userTypes";
import { formatDate } from "@/lib/textUtils";

type ReviewStepProps = {
    title: string;
    description: string;
    startTime: Date | null;
    collaborators: userInfo[];
    feedback: string;
};

const Row = ({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) => (
    <div className="flex flex-col gap-1">
        <div className="text-xs text-foreground-third">{label}</div>
        <div className="text-sm">{children}</div>
    </div>
);

const Placeholder = ({ text }: { text: string }) => (
    <span className="text-foreground-third">{text}</span>
);

const ReviewStep = ({
    title,
    description,
    startTime,
    collaborators,
    feedback,
}: ReviewStepProps) => {
    return (
        <div className="flex flex-col gap-5">
            <Row label="TITLE">
                {title.trim() ? title : <Placeholder text="Untitled workspace" />}
            </Row>
            <Row label="DESCRIPTION">
                {description.trim() ? (
                    description
                ) : (
                    <Placeholder text="No description" />
                )}
            </Row>
            <Row label="START TIME">
                {startTime ? formatDate(startTime) : <Placeholder text="Not set" />}
            </Row>
            <Row label="COLLABORATORS">
                {collaborators.length > 0 ? (
                    <div className="flex flex-col gap-1">
                        {collaborators.map((c, i) => (
                            <div key={c.email}>
                                {c.firstName} {c.lastName}
                                {i === 0 && (
                                    <span className="text-foreground-third text-xs ml-2">
                                        (owner)
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <Placeholder text="No collaborators added" />
                )}
            </Row>
            <Row label="FEEDBACK">
                {feedback.trim() ? (
                    <div className="whitespace-pre-wrap">{feedback}</div>
                ) : (
                    <Placeholder text="No feedback yet" />
                )}
            </Row>
        </div>
    );
};

export default ReviewStep;
