import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";

type TextInputProps = {
    title?: string;
    text: string;
    placeholder?: string;
    className?: string;
    onChange: (value: string) => void;
};

const MAX_ROWS = 8;

const TextInput = ({
    title,
    text,
    className,
    placeholder,
    onChange,
}: TextInputProps) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [interacting, setInteracting] = useState(false);
    const [value, setValue] = useState(text);

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.style.height = "auto";
        const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
        const maxHeight = lineHeight * MAX_ROWS;
        textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    };

    useEffect(() => {
        adjustHeight();
    }, [value]);

    useEffect(() => {
        setValue(text);
    }, [text]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setValue(e.target.value);
        onChange(e.target.value);
    };

    return (
        <div className="w-full h-full relative textd-base text-foreground">
            <div className="flex flex-col gap-2 z-100">
                {title && (
                    <div className="text-sm text-foreground-second">
                        {title}
                    </div>
                )}
                <textarea
                    ref={textareaRef}
                    className={cn(
                        "resize-none bg-transparent outline-none border-none overflow-y-auto",
                        className,
                    )}
                    value={text ? text : ""}
                    onChange={handleChange}
                    placeholder={placeholder}
                    rows={1}
                    onFocus={() => setInteracting(true)}
                    onBlur={() => setInteracting(false)}
                />
            </div>
            <div
                className={cn(
                    "absolute -left-2 -top-2 border-2 w-[calc(100%+1rem)] h-[calc(100%+1rem)] pointer-events-none rounded-md",
                    interacting ? "border-white/15" : "border-transparent",
                )}
            />
        </div>
    );
};

export default TextInput;
