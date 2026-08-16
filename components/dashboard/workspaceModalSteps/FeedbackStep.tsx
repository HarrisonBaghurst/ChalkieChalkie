import React from "react";
import { Textarea } from "@/components/ui/textarea";

type FeedbackStepProps = {
    feedback: string;
    onChange: (value: string) => void;
};

const FeedbackStep = ({ feedback, onChange }: FeedbackStepProps) => {
    return (
        <Textarea
            id="workspace-feedback"
            label="Post-session feedback"
            value={feedback}
            onChange={(e) => onChange(e.target.value)}
            placeholder="How did it go? What should you remember for next time?"
            rows={8}
        />
    );
};

export default FeedbackStep;
