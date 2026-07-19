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

// how long the cursor must rest on an unselected colour tool before its colour
// popover opens
const HOVER_OPEN_DELAY = 500;
// grace period after the cursor leaves before the popover closes, so moving
// across the gap between the button and the fan doesn't dismiss it
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

    // pen / highlighter carry a colour ref; other tools don't
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

    // clean up any pending timers on unmount
    useEffect(
        () => () => {
            clearHover();
            clearClose();
        },
        [],
    );

    // a colour tool reveals its palette after a short hover, whether or not
    // it is the active tool. Re-entering cancels a pending close.
    const handleMouseEnter = () => {
        clearClose();
        if (!isColourTool) return;
        clearHover();
        hoverTimer.current = setTimeout(
            () => setShowColourSelect(true),
            HOVER_OPEN_DELAY,
        );
    };

    // leaving the button (and its popover) cancels the hover and closes the
    // popover after a grace period
    const handleMouseLeave = () => {
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
            // already selected → toggle the palette to change colour
            setShowColourSelect((prev) => !prev);
        } else {
            // not selected → select the tool with its previous colour, no palette
            setShowColourSelect(false);
            onSelect?.();
        }
    };

    // picking a colour selects the tool and dismisses the palette
    const handleColourChosen = () => {
        setShowColourSelect(false);
        onSelect?.();
    };

    return (
        <div
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                className={cn(
                    "cursor-pointer w-12 h-12 radius-control flex items-center justify-center duration-150 transition-colors",
                    isActive
                        ? "bg-white/10"
                        : "bg-transparent hover:bg-white/5",
                )}
                onClick={handleClick}
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
