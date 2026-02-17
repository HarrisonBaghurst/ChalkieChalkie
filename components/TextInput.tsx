type TextInputProps = {
    title: string;
    placeholder: string;
    value: string;
    onChange: (text: string) => void;
    variant?: "short" | "long";
    onFocus?: () => void;
    onBlur?: () => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
};

const TextInput = ({
    title,
    placeholder,
    value,
    onChange,
    variant,
    onFocus,
    onBlur,
    onKeyDown,
}: TextInputProps) => {
    return (
        <div className="relative w-full h-fit">
            <p className="px-1 absolute left-2 -translate-y-1/2 text-xs text-foreground-third bg-[#181815]">
                {title}
            </p>
            {variant === "long" ? (
                <textarea
                    className="
                        border border-white/10 w-full h-full rounded-sm text-foreground text-sm p-2 resize-none
                        focus:outline-none focus:border-[#9756f2] focus:border-dashed
                    "
                    value={value}
                    rows={3}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                />
            ) : (
                <input
                    className="
                        border border-white/10 w-full h-full rounded-sm text-foreground text-sm p-2
                        focus:outline-none focus:border-[#9756f2] focus:border-dashed
                    "
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder}
                />
            )}
        </div>
    );
};

export default TextInput;
