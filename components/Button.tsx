import { cn } from "@/lib/utils";

type ButtonProps = {
    text: string;
    handleClick: () => void;
    variant: 'primary' | 'secondary';
    icon?: string;
}

const Button = ({ text, handleClick, variant, icon }: ButtonProps) => {
    return (
        <button
            className={cn('relative px-5 py-1.5 cursor-pointer text-md w-fit rounded-full flex justify-between gap-3 items-center border-b-white/25 border-b', variant === 'primary' ?
                'bg-linear-to-b from-cyan-400/90 to-blue-400/90 text-background shadow-[0_0_12px_rgba(255,255,255,0.25)] font-mont-bold' :
                'bg-linear-to-b from-card-background/60 to-[hsl(0,0,18%)]/60 backdrop-blur-md text-foreground'
            )}
            onClick={handleClick}
        >
            {text}
        </button>
    )
}

export default Button