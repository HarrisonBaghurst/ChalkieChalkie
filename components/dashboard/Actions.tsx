import React from "react";

const Actions = () => {
    const actions = ["Schedule Session", "Add New Tutee"];
    return (
        <div className="flex gap-8">
            {actions.map((action, i) => (
                <div key={i} className="bg-white/10 py-3 px-6 rounded-md">
                    {action}
                </div>
            ))}
        </div>
    );
};

export default Actions;
