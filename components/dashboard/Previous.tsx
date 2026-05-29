import React from "react";
import WorkspaceCard from "./WorkspaceCard";

const Previous = () => {
    return (
        <div className="w-full rounded-2xl py-6 px-6 border-2 border-white/5 bg-white/3 h-fit">
            <div className="flex flex-col gap-6">
                <div className="text-foreground-third">PREVIOUS SESSIONS</div>
                <div className="flex gap-4 items-center">
                    <div className="border-2 border-white/5 rounded-md h-10 w-full flex items-center px-2.5">
                        Search
                    </div>
                    <div className="border-2 h-10 border-white/5 rounded-md flex items-center px-2.5">
                        Asceding
                    </div>
                </div>
                <div className="flex flex-col gap-3 w-full">
                    {Array(5)
                        .fill("")
                        .map((_, i) => (
                            <div key={i} className="flex flex-col gap-3">
                                <div className="w-full bg-white/5 h-0.5" />
                                <WorkspaceCard />
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
};

export default Previous;
