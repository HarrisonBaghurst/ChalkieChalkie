"use client";

import { RefObject, useState } from "react";
import { color, motion } from "framer-motion";
import { useHistory } from "@liveblocks/react";
import { Tools } from "@/types/toolTypes";
import Image from "next/image";

type BottomBarProps = {
    currentColourRef: RefObject<string>;
    currentToolRef: RefObject<Tools>;
    onToolChanged: () => void;
};

const BottomBar = ({
    currentColourRef,
    currentToolRef,
    onToolChanged,
}: BottomBarProps) => {
    const tools: { tool: Tools; name: string }[] = [
        {
            tool: "pen",
            name: "White",
        },
        {
            tool: "eraser",
            name: "Eraser",
        },
        {
            tool: "pointer",
            name: "Pointer",
        },
    ];

    const colours: { colour: string; code: string }[] = [
        {
            colour: "White",
            code: "#e6e8e6",
        },
        {
            colour: "Yellow",
            code: "#fdca40",
        },
        {
            colour: "Orange",
            code: "#db6b2a",
        },
        {
            colour: "Red",
            code: "#df2935",
        },
        {
            colour: "Pink",
            code: "#db53d9",
        },
        {
            colour: "Blue",
            code: "#3772ff",
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
            backdrop-blur-lg border-white/10 border bg-white/5 z-100"
            >
                <div className="flex gap-2 items-end">
                    {tools.map((tool, index) => (
                        <motion.div
                            key={index}
                            className="w-10 h-fit rounded-lg p-2 aspect-square relative cursor-pointer bg-[#4b4b4b] border-2 border-[#303030] shadow-[inset_0_2px_2px_rgba(115,114,114,1),inset_0_-5px_6px_rgba(48,48,48,1)]"
                            animate={{
                                width:
                                    currentTool === index
                                        ? "3.5rem"
                                        : hoveredTool === index
                                          ? "2.75rem"
                                          : "2.5rem",
                            }}
                            onClick={() => {
                                // if tool has changed from previous
                                if (currentTool !== index) {
                                    onToolChanged();
                                }

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
                        className="w-10 h-fit rounded-lg p-2 aspect-square relative cursor-pointer bg-[#4b4b4b] border-2 border-[#303030] shadow-[inset_0_2px_2px_rgba(115,114,114,1),inset_0_-5px_6px_rgba(48,48,48,1)]"
                        onClick={undo}
                    >
                        <div className="relative w-full h-full">
                            <Image src={"/icons/undo.svg"} alt="undo" fill />
                        </div>
                    </button>
                    <button
                        className="w-10 h-fit rounded-lg p-2 aspect-square relative cursor-pointer bg-[#4b4b4b] border-2 border-[#303030] shadow-[inset_0_2px_2px_rgba(115,114,114,1),inset_0_-5px_6px_rgba(48,48,48,1)]"
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
            <motion.div
                className="absolute bottom-22 h-14 left-1/2 -translate-x-1/2 p-2 backdrop-blur-lg border-white/10 border bg-white/5 rounded-xl flex gap-2 items-end"
                animate={{
                    opacity: showColourSelect ? 1 : 0,
                    y: showColourSelect ? 0 : 20,
                    pointerEvents: showColourSelect ? "auto" : "none",
                }}
                transition={{ duration: 0.2 }}
            >
                {colours.map((colour, index) => (
                    <motion.div
                        key={index}
                        className="w-10 aspect-square rounded-lg border-white/25 border-2"
                        style={{ backgroundColor: `${colour.code}` }}
                        animate={{
                            width:
                                currentColour === index
                                    ? "3.5rem"
                                    : hoveredColour === index
                                      ? "2.75rem"
                                      : "2.5rem",
                            opacity: showColourSelect ? 1 : 0,
                            y: showColourSelect ? 0 : 40,
                        }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        onClick={() => {
                            currentColourRef.current = colour.code;
                            setCurrentColour(index);
                        }}
                        onHoverStart={() => setHoveredColour(index)}
                        onHoverEnd={() => setHoveredColour(null)}
                    />
                ))}
            </motion.div>
        </>
    );
};

export default BottomBar;
