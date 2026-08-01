import React from "react";
import { Textarea } from "@/components/ui/textarea";

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
            <Textarea
                id="workspace-feedback"
                value={feedback}
                onChange={(e) => onChange(e.target.value)}
                placeholder="How did it go? What should you remember for next time?"
                rows={8}
                className="mt-2"
            />
        </div>
    );
};

export default FeedbackStep;
