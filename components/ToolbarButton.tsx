import { cn } from "@/lib/utils";
import { RefObject, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence } from "motion/react";
import ColourSelector from "./ColourSelector";
import { HIGHLIGHT_COLOURS } from "@/lib/colours";

interface ToolbarButtonProps {
    icon: string;
    label: string;
    isActive?: boolean;
    onSelect?: () => void;
    onAction?: () => void;
    currentColourRef?: RefObject<string>;
    highlightColourRef?: RefObject<string>;
}

const HOVER_OPEN_DELAY = 500;
// Grace period, so crossing the gap to the fan doesn't dismiss it.
const HOVER_CLOSE_DELAY = 500;

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
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isColourTool = !!currentColourRef || !!highlightColourRef;
    const activeColourRef = currentColourRef ?? highlightColourRef;

    const clearHover = () => {
        if (hoverTimer.current) {
            clearTimeout(hoverTimer.current);
            hoverTimer.current = null;
        }
    };

    const clearClose = () => {
        if (closeTimer.current) {
            clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
    };

    useEffect(
        () => () => {
            clearHover();
            clearClose();
        },
        [],
    );

    const handleButtonEnter = () => {
        clearClose();
        if (!isColourTool) return;
        clearHover();
        hoverTimer.current = setTimeout(
            () => setShowColourSelect(true),
            HOVER_OPEN_DELAY,
        );
    };

    const handleAreaLeave = () => {
        clearHover();
        clearClose();
        closeTimer.current = setTimeout(
            () => setShowColourSelect(false),
            HOVER_CLOSE_DELAY,
        );
    };

    const handleClick = () => {
        if (!isColourTool) {
            onSelect?.();
            onAction?.();
            return;
        }
        clearHover();
        clearClose();
        if (isActive) {
            setShowColourSelect((prev) => !prev);
        } else {
            setShowColourSelect(false);
            onSelect?.();
        }
    };

    const handleColourChosen = () => {
        setShowColourSelect(false);
        onSelect?.();
    };

    return (
        <div
            className="relative"
            onMouseEnter={clearClose}
            onMouseLeave={handleAreaLeave}
        >
            <button
                className={cn(
                    "cursor-pointer w-12 h-12 radius-control flex items-center justify-center duration-150 transition-colors",
                    isActive
                        ? "bg-white/10"
                        : "bg-transparent hover:bg-white/5",
                )}
                onClick={handleClick}
                onMouseEnter={handleButtonEnter}
                onMouseLeave={clearHover}
            >
                <div className="relative w-6 h-6">
                    <Image src={icon} alt={label} fill />
                </div>
            </button>

            <AnimatePresence>
                {showColourSelect && activeColourRef && (
                    <ColourSelector
                        key="colour-fan"
                        currentColourRef={activeColourRef}
                        colours={
                            highlightColourRef ? HIGHLIGHT_COLOURS : undefined
                        }
                        onColourChosen={handleColourChosen}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default ToolbarButton;
