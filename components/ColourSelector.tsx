import { COLOURS } from "@/lib/colours";
import { cn } from "@/lib/utils";
import { RefObject, useState } from "react";

interface ColourSelectorProps {
    visible: boolean;
    currentColourRef: RefObject<string>;
    colours?: string[];
}

const BRIGHT_GRADIENT =
    "linear-gradient(150deg, rgba(219, 193, 90, 1) 0%, rgba(245, 139, 47, 1) 35%, rgba(227, 104, 104, 1) 62%, rgba(230, 110, 170, 1) 99%)";

const ColourSelector = ({
    visible,
    currentColourRef,
    colours,
}: ColourSelectorProps) => {
    const displayColours = colours ?? COLOURS.map((c) => c.code);
    const [selected, setSelected] = useState(currentColourRef.current);

    return (
        <div className="absolute -top-5 left-14 bg-card-background rounded-md flex gap-2 p-2">
            {displayColours.map((code, i) => {
                const isSelected = selected === code;
                return (
                    <div
                        key={i}
                        className={cn(
                            "cursor-pointer w-12 h-12 rounded-md border-2 transition-colors duration-150",
                            isSelected
                                ? "border-transparent"
                                : "border-foreground-third hover:border-foreground-second",
                        )}
                        style={
                            isSelected
                                ? {
                                      background: `linear-gradient(${code}, ${code}) padding-box, ${BRIGHT_GRADIENT} border-box`,
                                  }
                                : { backgroundColor: code }
                        }
                        onClick={() => {
                            currentColourRef.current = code;
                            setSelected(code);
                        }}
                    />
                );
            })}
        </div>
    );
};

export default ColourSelector;
