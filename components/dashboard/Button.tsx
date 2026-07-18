import { cn } from "@/lib/utils";
import Image from "next/image";
import React from "react";

type ButtonProps = {
    text: string;
    onClick: () => void;
    size?: "regular" | "large";
    disabled?: boolean;
    icon?: string;
    iconClassName?: string;
};

const Button = ({
    text,
    onClick,
    size,
    disabled = false,
    icon,
    iconClassName,
}: ButtonProps) => {
    if (icon) {
        return (
            <button
                onClick={onClick}
                disabled={disabled}
                aria-label={text}
                className={cn(
                    "bg-foreground radius-control flex items-center justify-center",
                    size && size == "large" ? "size-11" : "size-9",
                    disabled
                        ? "opacity-40 cursor-not-allowed"
                        : "cursor-pointer",
                )}
            >
                <Image
                    src={icon}
                    alt={text}
                    width={18}
                    height={18}
                    className={cn("pointer-events-none", iconClassName)}
                />
            </button>
        );
    }

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "text-background! bg-foreground radius-control h-fit",
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
