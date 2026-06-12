import { cn } from "@/lib/utils";
import React from "react";

type ButtonProps = {
    text: string;
    onClick: () => void;
    size?: "regular" | "large";
    disabled?: boolean;
};

const Button = ({ text, onClick, size, disabled = false }: ButtonProps) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "text-background! bg-foreground rounded-sm h-fit",
                size && size == "large"
                    ? "py-2.5 px-7 text-body"
                    : "py-2 px-5 text-caption",
                disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
            )}
        >
            {text}
        </button>
    );
};

export default Button;
