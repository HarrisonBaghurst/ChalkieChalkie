import React from "react";

type InfoTagProps = {
    text: string;
    icon?: string;
    className?: string;
};

const InfoTag = ({ text, icon, className }: InfoTagProps) => {
    return (
        <div
            className={`inline-flex items-center gap-1.5 w-fit bg-foreground-third/40 text-foreground-second text-caption font-inter-regular px-2 py-1 radius-tag ${
                className ?? ""
            }`}
        >
            {icon && (
                <span
                    aria-hidden
                    className="w-3.5 h-3.5 bg-current"
                    style={{
                        maskImage: `url(${icon})`,
                        WebkitMaskImage: `url(${icon})`,
                        maskRepeat: "no-repeat",
                        WebkitMaskRepeat: "no-repeat",
                        maskSize: "contain",
                        WebkitMaskSize: "contain",
                        maskPosition: "center",
                        WebkitMaskPosition: "center",
                    }}
                />
            )}
            {text}
        </div>
    );
};

export default InfoTag;
