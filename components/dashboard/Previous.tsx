import React from "react";
import WorkspaceCard from "./WorkspaceCard";

const Previous = () => {
    return (
        <div className="w-1/2 bg-card-background rounded-xl p-4 flex flex-col gap-4 h-fit">
            <p className="text-xs text-foreground-third font-inter-bold">
                PREVIOUS
            </p>
            <div className="flex gap-4">
                <div className="w-2/3 border border-foreground-third rounded-md py-2 px-3 text-foreground-third text-sm">
                    Search upcoming sessions...
                </div>
                <div className="w-1/3 border border-foreground-third rounded-md py-2 px-3 text-foreground-third text-sm">
                    Filter by name
                </div>
            </div>
            <div className="flex flex-col gap-4">
                <WorkspaceCard description={true} />
                <WorkspaceCard description={true} />
                <WorkspaceCard description={true} />
                <WorkspaceCard description={true} />
                <WorkspaceCard description={true} />
            </div>
        </div>
    );
};

export default Previous;
