import { cn } from "@/lib/utils";
import React from "react";

type ButtonProps = {
    text: string;
    onClick: () => void;
    size?: "regular" | "large";
};

const Button = ({ text, onClick, size }: ButtonProps) => {
    return (
        <button
            onClick={onClick}
            className={cn(
                "text-background bg-foreground rounded-sm cursor-pointer h-fit",
                size && size == "large"
                    ? "py-2.5 px-7 text-md"
                    : "py-2 px-5 text-xs",
            )}
        >
            {text}
        </button>
    );
};

export default Button;
