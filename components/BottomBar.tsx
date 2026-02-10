"use client";

import { RefObject, useState } from "react";
import { motion } from "framer-motion";
import { useHistory } from "@liveblocks/react";
import { Tools } from "@/types/toolTypes";
import Image from "next/image";

type BottomBarProps = {
    currentColourRef: RefObject<string>;
    currentToolRef: RefObject<Tools>;
};

const RADIUS = 400;
const ANGLE_SPREAD = 58;

const BottomBar = ({ currentColourRef, currentToolRef }: BottomBarProps) => {
    const tools: { tool: Tools; code: string; name: string }[] = [
        {
            tool: "pen",
            code: "#eeeeee",
            name: "White",
        },
        {
            tool: "eraser",
            code: "#141414",
            name: "Eraser",
        },
    ];

    const colours: { colour: string; code: string }[] = [
        {
            colour: "White",
            code: "#eeeeee",
        },
        {
            colour: "Yellow",
            code: "#ffbe0b",
        },
        {
            colour: "Orange",
            code: "#fb5607",
        },
        {
            colour: "Pink",
            code: "#ff006e",
        },
        {
            colour: "Purple",
            code: "#8338ec",
        },
        {
            colour: "Blue",
            code: "#3a86ff",
        },
    ];

    const [currentTool, setCurrentTool] = useState<number>(0);
    const [hoveredTool, setHoveredTool] = useState<number | null>(null);

    const [currentColour, setCurrentColour] = useState<number>(0);
    const [hoveredColour, setHoveredColour] = useState<number | null>(null);

    const [showColourSelect, setShowColourSelect] = useState<boolean>(false);

    const { undo, redo } = useHistory();

    return (
        <>
            <div
                className="
            fixed bottom-2 left-1/2 -translate-x-1/2 h-14 rounded-xl flex gap-4 p-2 items-end
            bg-linear-to-b from-card-background/60 to-[hsl(0,0,18%)]/60 backdrop-blur-md border-b-white/25 border-b z-100"
            >
                <div className="flex gap-2 items-end">
                    {tools.map((tool, index) => (
                        <motion.div
                            key={index}
                            className="w-10 h-fit rounded-md p-2 aspect-square relative cursor-pointer bg-card-background border-b border-b-white/25"
                            animate={{
                                width:
                                    currentTool === index
                                        ? "3.5rem"
                                        : hoveredTool === index
                                          ? "2.75rem"
                                          : "2.5rem",
                            }}
                            onClick={() => {
                                setCurrentTool(index);
                                currentToolRef.current = tool.tool;
                                if (tool.tool === "pen") {
                                    setShowColourSelect(true);
                                } else {
                                    setShowColourSelect(false);
                                }
                            }}
                            onHoverStart={() => setHoveredTool(index)}
                            onHoverEnd={() => setHoveredTool(null)}
                            transition={{
                                ease: "easeInOut",
                                duration: 0.2,
                            }}
                        >
                            <div className="relative w-full h-full">
                                <Image
                                    src={`/icons/${tool.tool}.svg`}
                                    alt={tool.name}
                                    fill
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
                <div className="flex gap-2 items-end">
                    <button
                        className="relative p-2 w-10 h-fit aspect-square rounded-md bg-card-background border-b border-b-white/25 cursor-pointer"
                        onClick={undo}
                    >
                        <div className="relative w-full h-full">
                            <Image src={"/icons/undo.svg"} alt="undo" fill />
                        </div>
                    </button>
                    <button
                        className="relative p-2 w-10 h-fit aspect-square rounded-md bg-card-background border-b border-b-white/25 cursor-pointer"
                        onClick={redo}
                    >
                        <div className="relative w-full h-full">
                            <Image
                                src={"/icons/undo.svg"}
                                alt="undo"
                                fill
                                className="scale-x-[-1]"
                            />
                        </div>
                    </button>
                </div>
            </div>
            <div className="absolute bottom-48 left-1/2 -translate-x-1/2">
                {colours.map((colour, index) => {
                    const totalItems = colours.length;
                    const angle =
                        (index - (totalItems - 1) / 2) *
                        (ANGLE_SPREAD / (totalItems - 1));
                    const radian = (angle * Math.PI) / 180;

                    const x = Math.sin(radian) * RADIUS;
                    const y = RADIUS - Math.cos(radian) * RADIUS;

                    return (
                        <motion.div
                            key={index}
                            initial={false}
                            animate={{
                                x: showColourSelect ? x : 0,
                                y: showColourSelect ? y : 250,
                                opacity: showColourSelect ? 100 : 0,
                                rotate: angle,
                                scale:
                                    currentColour === index
                                        ? 1.15
                                        : hoveredColour === index
                                          ? 1.05
                                          : 1,
                            }}
                            className="absolute w-16 h-18 rounded-xl bg-white backdrop-blur-md -translate-x-1/2 overflow-hidden z-0"
                            style={{ originY: "bottom" }}
                            onClick={() => {
                                currentColourRef.current = colour.code;
                                setCurrentColour(index);
                                setShowColourSelect(false);
                            }}
                            onHoverStart={() => setHoveredColour(index)}
                            onHoverEnd={() => setHoveredColour(null)}
                        >
                            <div className="absolute text-xs bottom-0 p-1 text-background font-bold">
                                {colour.colour}
                            </div>
                            <div
                                className="absolute top-0 left-0 w-full h-12 border-b border-b-white/25"
                                style={{ backgroundColor: colour.code }}
                            />
                        </motion.div>
                    );
                })}
            </div>
        </>
    );
};

export default BottomBar;
