import React from "react";

const WorkspaceCard = () => {
    return (
        <div className="flex justify-between items-center">
            <div className="flex gap-4 items-center">
                <div className="w-12 h-12 bg-white/10 rounded-full" />
                <div>
                    <div>Example Name - 55</div>
                    <div className="text-sm text-foreground-third">
                        Description will go here eventually
                    </div>
                </div>
            </div>
            <div className="flex gap-8 justify-end items-center">
                <div className="flex flex-col">
                    <div>Friday • 16:30</div>
                    <div className="text-sm text-foreground-third">
                        11/12/26
                    </div>
                </div>
                <div className="bg-white/10 rounded-md py-2 px-4">Edit</div>
            </div>
        </div>
    );
};

export default WorkspaceCard;
