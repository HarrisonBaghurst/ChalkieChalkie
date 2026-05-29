import React from "react";

const Next = () => {
    return (
        <div className="w-2/3 rounded-2xl py-6 px-6 border-2 border-white/10 bg-white/10">
            <div className="flex justify-between items-center">
                <div className="flex gap-7 items-center">
                    <div className="w-16 h-16 rounded-full bg-white/10" />
                    <div className="flex flex-col gap-1">
                        <div className="flex gap-3 ">
                            <span>Next Session</span>
                            <span>•</span>
                            <span>Today 19:00</span>
                        </div>
                        <h1 className="text-2xl font-poppins-regular text-foreground">
                            Example Name - 55
                        </h1>
                        <div className="">
                            This is the description of the workspace
                        </div>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white/10 py-3 px-6 rounded-md">
                        Edit Workspace
                    </div>
                    <div className="bg-white/10 py-3 px-6 rounded-md">
                        Join Workspace
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Next;
