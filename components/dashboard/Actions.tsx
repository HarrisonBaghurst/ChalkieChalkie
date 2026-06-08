import React from "react";
import Button from "./Button";

const Actions = () => {
    const buttons = ["Create Workspace", "Add New Tutee"];
    return (
        <div className="flex gap-6">
            {buttons.map((text, i) => (
                <Button key={i} text={text} onClick={() => {}} />
            ))}
        </div>
    );
};

export default Actions;
