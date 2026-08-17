import { PEN_COLOURS } from "@/lib/colours";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { RefObject, useState } from "react";

interface ColourSelectorProps {
    currentColourRef: RefObject<string>;
    colours?: { colour: string; code: string }[];
    onColourChosen?: () => void;
}

// Every card shares one anchor and pivots about a point RADIUS below it, so
// animating `rotate` alone carries it along the arc, tangent as it goes.
const CARD_W = 72;
const CARD_H = 86;
const CARD_GAP = 10;
const RADIUS = 800;
const STEP_DEG = ((CARD_W + CARD_GAP) / RADIUS) * (180 / Math.PI);
// Cards start tucked fully behind the clip edge, so they slide out from under
// the sidebar rather than fading in.
const FIRST_CARD_X = 15;
const TOP_PAD = 12;
const ENTRY_DEG = ((FIRST_CARD_X + CARD_W + 8) / RADIUS) * (180 / Math.PI);
const STAGGER_IN = 0;
const STAGGER_OUT = 0;

const ColourSelector = ({
    currentColourRef,
    colours,
    onColourChosen,
}: ColourSelectorProps) => {
    const displayColours = colours ?? PEN_COLOURS;
    const [selected, setSelected] = useState(currentColourRef.current);

    const count = displayColours.length;
    const lastRad = ((count - 1) * STEP_DEG * Math.PI) / 180;
    // Padded so the hover lift isn't clipped.
    const fanWidth = FIRST_CARD_X + count * (CARD_W + CARD_GAP) + 20;
    const fanHeight = TOP_PAD + CARD_H + RADIUS * (1 - Math.cos(lastRad)) + 24;

    return (
        <div
            className="absolute left-full top-1/2 z-50 pointer-events-none overflow-hidden"
            style={{
                width: fanWidth,
                height: fanHeight,
                // button right edge → sidebar right edge: p-2 (8px) + 1px border
                marginLeft: 9,
                marginTop: -(CARD_H / 2 + TOP_PAD),
            }}
        >
            {displayColours.map(({ colour, code }, i) => {
                const isSelected = selected === code;
                return (
                    <motion.div
                        key={code}
                        className="absolute pointer-events-auto"
                        style={{
                            left: FIRST_CARD_X,
                            top: TOP_PAD,
                            width: CARD_W,
                            height: CARD_H,
                            transformOrigin: `${CARD_W / 2}px ${
                                CARD_H / 2 + RADIUS
                            }px`,
                        }}
                        initial={{ rotate: -ENTRY_DEG }}
                        animate={{
                            rotate: i * STEP_DEG,
                            transition: {
                                duration: 0.3,
                                ease: "easeOut",
                                delay: (count - 1 - i) * STAGGER_IN,
                            },
                        }}
                        exit={{
                            rotate: -ENTRY_DEG,
                            transition: {
                                duration: 0.2,
                                ease: "easeIn",
                                delay: i * STAGGER_OUT,
                            },
                        }}
                    >
                        <motion.button
                            aria-label={`Colour ${colour}`}
                            className={cn(
                                "cursor-pointer w-full h-full flex flex-col overflow-hidden radius-control border bg-card-background text-left shadow-md shadow-black/30 transition-colors duration-150",
                                isSelected
                                    ? "border-foreground-third/60"
                                    : "border-foreground-third/15 hover:border-foreground-third/35",
                            )}
                            animate={{
                                scale: isSelected ? 1.05 : 1,
                                y: isSelected ? -3 : 0,
                            }}
                            whileHover={{
                                scale: isSelected ? 1.07 : 1.03,
                                y: isSelected ? -4 : -2,
                            }}
                            transition={{ duration: 0.15 }}
                            onClick={() => {
                                currentColourRef.current = code;
                                setSelected(code);
                                onColourChosen?.();
                            }}
                        >
                            <span
                                className="w-full flex-1"
                                style={{ backgroundColor: code }}
                            />
                            <span className="px-1.5 py-1 leading-tight">
                                <span className="block text-[10px] font-inter-bold text-foreground">
                                    {colour}
                                </span>
                                <span className="block text-[9px] text-foreground-third">
                                    {code}
                                </span>
                            </span>
                        </motion.button>
                    </motion.div>
                );
            })}
        </div>
    );
};

export default ColourSelector;
