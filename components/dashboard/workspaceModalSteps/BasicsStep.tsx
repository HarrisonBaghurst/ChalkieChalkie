import React from "react";

type BasicsStepProps = {
    title: string;
    description: string;
    onTitleChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
};

const inputClass =
    "border border-foreground-third radius-control py-2 px-3 text-small placeholder:text-foreground-third focus:outline-none bg-transparent text-foreground";

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
                <input
                    id="workspace-title"
                    type="text"
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="e.g. Maths tutoring"
                    className={inputClass}
                />
            </div>
            <div className="flex flex-col gap-2">
                <label
                    htmlFor="workspace-description"
                    className="text-caption text-foreground-third"
                >
                    DESCRIPTION
                </label>
                <textarea
                    id="workspace-description"
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    placeholder="What is this workspace for?"
                    rows={5}
                    className={`${inputClass} resize-none`}
                />
            </div>
        </div>
    );
};

export default BasicsStep;
