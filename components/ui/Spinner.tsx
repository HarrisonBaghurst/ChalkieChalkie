import React from "react";
import { cn } from "@/lib/utils";

type SpinnerProps = {
    className?: string;
};

// Branded ring spinner. Defaults to a 40px ring; override size via `className`.
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
