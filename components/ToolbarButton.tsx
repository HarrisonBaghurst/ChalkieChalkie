import { cn } from "@/lib/utils";
import { RefObject, useEffect, useState } from "react";
import Image from "next/image";
import ColourSelector from "./ColourSelector";
import { HIGHLIGHT_COLOURS } from "@/lib/highlightColours";

interface ToolbarButtonProps {
    icon: string;
    label: string;
    isActive?: boolean;
    onSelect?: () => void;
    onAction?: () => void;
    currentColourRef?: RefObject<string>;
    highlightColourRef?: RefObject<string>;
}

const ToolbarButton = ({
    icon,
    label,
    isActive,
    onSelect,
    onAction,
    currentColourRef,
    highlightColourRef,
}: ToolbarButtonProps) => {
    const [showColourSelect, setShowColourSelect] = useState(false);

    // Close the colour selector when this tool is no longer active
    // (e.g. the user switched to a different tool).
    useEffect(() => {
        if (!isActive) setShowColourSelect(false);
    }, [isActive]);

    const hasColourPicker =
        isActive && (currentColourRef?.current || highlightColourRef?.current);
    const activeColour =
        currentColourRef?.current ?? highlightColourRef?.current;

    const handleClick = () => {
        if (hasColourPicker) {
            setShowColourSelect((prev) => !prev);
        }
        onSelect?.();
        onAction?.();
    };

    return (
        <button
            className={cn(
                "cursor-pointer w-12 h-12 rounded-sm flex items-center justify-center duration-150 border-2 transition-colors",
                isActive
                    ? "gradient-border-bright"
                    : "border-foreground-third hover:border-foreground-second bg-transparent",
            )}
            onClick={() => handleClick()}
        >
            <div className="relative w-6 h-6">
                <Image src={icon} alt={label} fill />
                <div
                    className={cn(
                        "absolute rounded-full w-4 h-4 bottom-1/2 translate-y-1/2 -right-12",
                        hasColourPicker ? "block" : "hidden",
                    )}
                    style={{ backgroundColor: activeColour }}
                />
                {showColourSelect && currentColourRef?.current && (
                    <ColourSelector
                        visible={showColourSelect}
                        currentColourRef={currentColourRef}
                    />
                )}
                {showColourSelect && highlightColourRef?.current && (
                    <ColourSelector
                        visible={showColourSelect}
                        currentColourRef={highlightColourRef}
                        colours={[...HIGHLIGHT_COLOURS]}
                    />
                )}
            </div>
        </button>
    );
};

export default ToolbarButton;
