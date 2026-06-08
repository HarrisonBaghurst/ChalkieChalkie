import React from "react";

type ButtonProps = {
    text: string;
    onClick: () => void;
};

const Button = ({ text, onClick }: ButtonProps) => {
    return (
        <button
            onClick={onClick}
            className="text-background bg-foreground rounded-sm py-2 px-5 text-xs cursor-pointer"
        >
            {text}
        </button>
    );
};

export default Button;
