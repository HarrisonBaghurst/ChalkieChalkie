import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type BasicsStepProps = {
    title: string;
    description: string;
    onTitleChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
};

const BasicsStep = ({
    title,
    description,
    onTitleChange,
    onDescriptionChange,
}: BasicsStepProps) => {
    return (
        <div className="flex flex-col gap-6">
            <Input
                id="workspace-title"
                type="text"
                label="Title"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="e.g. Maths tutoring"
            />
            <Textarea
                id="workspace-description"
                label="Description"
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="What is this workspace for?"
                rows={5}
            />
        </div>
    );
};

export default BasicsStep;
