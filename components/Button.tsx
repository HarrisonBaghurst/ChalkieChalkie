import { cn } from "@/lib/utils";
import Image from "next/image";

type ButtonProps = {
    text: string;
    handleClick: () => void;
    variant: "primary" | "secondary" | "delete" | "save";
    size?: "small" | "large";
    icon?: string;
    className?: string;
    clickable?: boolean;
};

const Button = ({
    text,
    handleClick,
    variant,
    icon,
    size,
    className,
    clickable,
}: ButtonProps) => {
    return (
        <button
            className={cn(
                "text-foreground rounded-full cursor-pointer border-2 border-[#0f348b]",
                variant === "delete" || variant === "save"
                    ? "p-1"
                    : size === "small"
                      ? "px-3 py-1 text-xs"
                      : "px-6 py-2",
                variant === "primary"
                    ? "bg-[#0f348b]"
                    : variant === "delete"
                      ? "bg-[#c21f2f] border-[#c21f2f]"
                      : variant === "save"
                        ? "bg-[#3a9630] border-[#3a9630]"
                        : "border-white/15",
                className,
                clickable === false ? "opacity-25" : "",
            )}
            onClick={handleClick}
        >
            {icon ? (
                <div className="relative w-4 h-4">
                    <Image src={icon} alt={text} fill />
                </div>
            ) : (
                <div>{text}</div>
            )}
        </button>
    );
};

export default Button;
