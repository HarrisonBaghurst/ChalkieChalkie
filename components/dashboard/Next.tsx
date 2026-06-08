import React from "react";
import Button from "./Button";

const Next = () => {
    return (
        <div className="w-220 bg-background-second p-4 rounded-xl flex justify-between">
            <div className="flex flex-col gap-2">
                <p className="text-xs text-foreground-second font-inter-bold">
                    COMING UP NEXT
                </p>
                <p className="text-lg font-inter-bold">Harrison Baghurst 55</p>
                <p className="text-xs max-w-100 text-foreground-second">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
                    do eiusmod tempor incididunt ut labore et dolore
                </p>
            </div>
            <div className="flex flex-col justify-center gap-2">
                <p className="font-inter-bold text-center">Today 19:30</p>
                <Button text="Join Workspace" onClick={() => {}} />
            </div>
        </div>
    );
};

export default Next;
