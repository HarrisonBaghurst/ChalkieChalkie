import React from "react";
import { cn } from "@/lib/utils";

type SpinnerProps = {
    className?: string;
};

const Spinner = ({ className }: SpinnerProps) => {
    return (
        <div
            role="status"
            aria-label="Loading"
            className={cn("spinner-chalk animate-spin h-10 w-10", className)}
        />
    );
};

export default Spinner;
