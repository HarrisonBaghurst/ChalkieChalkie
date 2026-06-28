import React from "react";

type FeedbackStepProps = {
    feedback: string;
    onChange: (value: string) => void;
};

const FeedbackStep = ({ feedback, onChange }: FeedbackStepProps) => {
    return (
        <div className="flex flex-col gap-2">
            <label
                htmlFor="workspace-feedback"
                className="text-caption text-foreground-third"
            >
                POST-SESSION FEEDBACK
            </label>
            <p className="text-caption text-foreground-third">
                Notes for after the session — leave blank if you&apos;re not
                ready.
            </p>
            <textarea
                id="workspace-feedback"
                value={feedback}
                onChange={(e) => onChange(e.target.value)}
                placeholder="How did it go? What should you remember for next time?"
                rows={8}
                className="border border-foreground-third rounded-md py-2 px-3 text-small placeholder:text-foreground-third focus:outline-none bg-transparent text-foreground resize-none mt-2"
            />
        </div>
    );
};

export default FeedbackStep;
