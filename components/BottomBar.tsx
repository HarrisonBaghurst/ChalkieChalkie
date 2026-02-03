'use client'

import { RefObject, useState } from "react";
import { motion } from 'framer-motion';
import { useHistory } from "@liveblocks/react";
import { Tools } from "@/types/toolTypes";
import Image from "next/image";

type BottomBarProps = {
    currentColourRef: RefObject<string>;
    currentToolRef: RefObject<Tools>;
}

const Sidebar = ({ currentColourRef, currentToolRef }: BottomBarProps) => {
    const tools: { 'tool': Tools, 'code': string, 'name': string }[] = [
        {
            'tool': 'pen',
            'code': '#dddddd',
            'name': 'White',
        },
        {
            'tool': 'eraser',
            'code': '#141414',
            'name': 'Eraser',
        },
    ];

    const [currentTool, setCurrentTool] = useState<number>(0);
    const [hoveredTool, setHoveredTool] = useState<number | null>(null);

    const { undo, redo } = useHistory();

    return (
        <div className="
        fixed bottom-2 left-1/2 -translate-x-1/2 h-14 rounded-xl flex gap-4 p-2 items-end
        bg-linear-to-b from-card-background/60 to-[hsl(0,0,18%)]/60 backdrop-blur-md border-b-white/25 border-b"
        >
            <div className="flex gap-2 items-end">
                {tools.map((tool, index) => (
                    <motion.div
                        key={index}
                        className="w-10 h-fit rounded-md p-2 aspect-square relative border-[1.25px] border-foreground-second cursor-pointer"
                        animate={{ width: currentTool === index ? '3.5rem' : hoveredTool === index ? '2.75rem' : '2.5rem' }}
                        onClick={() => {
                            setCurrentTool(index);
                            currentColourRef.current = tool.code;
                            currentToolRef.current = tool.tool;
                        }}
                        onHoverStart={() => setHoveredTool(index)}
                        onHoverEnd={() => setHoveredTool(null)}
                        transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 25,
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
                    className="relative p-2 w-10 h-fit aspect-square rounded-md border-[1.25px] border-foreground-second cursor-pointer"
                    onClick={undo}
                >
                    <div className="relative w-full h-full">
                        <Image
                            src={'/icons/undo.svg'}
                            alt="undo"
                            fill
                        />
                    </div>
                </button>
                <button
                    className="relative p-2 w-10 h-fit aspect-square rounded-md border-[1.25px] border-foreground-second cursor-pointer"
                    onClick={redo}
                >
                    <div className="relative w-full h-full">
                        <Image
                            src={'/icons/undo.svg'}
                            alt="undo"
                            fill
                            className="scale-x-[-1]"
                        />
                    </div>
                </button>
            </div>
        </div>
    )
}

export default Sidebar