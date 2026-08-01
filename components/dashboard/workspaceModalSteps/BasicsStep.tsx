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
            <div className="flex flex-col gap-2">
                <label
                    htmlFor="workspace-title"
                    className="text-caption text-foreground-third"
                >
                    TITLE
                </label>
                <Input
                    id="workspace-title"
                    type="text"
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="e.g. Maths tutoring"
                />
            </div>
            <div className="flex flex-col gap-2">
                <label
                    htmlFor="workspace-description"
                    className="text-caption text-foreground-third"
                >
                    DESCRIPTION
                </label>
                <Textarea
                    id="workspace-description"
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    placeholder="What is this workspace for?"
                    rows={5}
                />
            </div>
        </div>
    );
};

export default BasicsStep;
