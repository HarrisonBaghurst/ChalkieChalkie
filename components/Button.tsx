import { cn } from "@/lib/utils";

type ButtonProps = {
    text: string;
    handleClick: () => void;
    variant: "primary" | "secondary";
    icon?: string;
    className?: string;
};

const Button = ({
    text,
    handleClick,
    variant,
    icon,
    className,
}: ButtonProps) => {
    return (
        <button
            className={cn(
                "relative px-4 py-2 cursor-pointer rounded-xl flex justify-center gap-4 items-center text-sm",
                variant === "primary"
                    ? "bg-[#6d16e8] border-2 border-[#4c03b1] shadow-[inset_0_2px_2px_rgba(140,67,243,1),inset_0_-5px_6px_rgba(76,3,177,1)] font-mont-bold text-foreground"
                    : "bg-[#4b4b4b] border-2 border-[#303030] shadow-[inset_0_2px_2px_rgba(115,114,114,1),inset_0_-5px_6px_rgba(48,48,48,1)] text-foreground",
                className && className,
            )}
            onClick={handleClick}
        >
            {text}
        </button>
    );
};

export default Button;
