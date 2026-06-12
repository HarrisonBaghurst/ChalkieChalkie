import React from "react";
import Spinner from "./ui/Spinner";

const FullscreenLoader = () => {
    return (
        <div className="w-dvw h-dvh overflow-hidden flex flex-col gap-4 justify-center items-center dotted-paper bg-background">
            <Spinner />
            <p className="text-foreground-second font-inter-bold">
                Loading workspace …
            </p>
        </div>
    );
};

export default FullscreenLoader;
