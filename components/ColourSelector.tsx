import { COLOURS } from "@/lib/colours";
import { RefObject } from "react";

interface ColourSelectorProps {
    visible: boolean;
    currentColourRef: RefObject<string>;
    colours?: string[];
}

const ColourSelector = ({ visible, currentColourRef, colours }: ColourSelectorProps) => {
    const displayColours = colours ?? COLOURS.map((c) => c.code);
    return (
        <div className="absolute -top-5 left-14 bg-[#0d0d0a] rounded-full border border-[color-mix(in_oklab,var(--color-white)_5%,transparent)] flex gap-2 p-3">
            {displayColours.map((code, i) => (
                <div
                    key={i}
                    className="w-10 h-10 rounded-full border-2 border-[#191916] hover:border-[#777777] transition-colors duration-150"
                    style={{ backgroundColor: code }}
                    onClick={() => (currentColourRef.current = code)}
                />
            ))}
        </div>
    );
};

export default ColourSelector;
