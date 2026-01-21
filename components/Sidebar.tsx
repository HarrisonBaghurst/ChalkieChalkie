'use client'

import { RefObject, useState } from "react";
import { motion } from 'framer-motion';
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Stroke } from '@/types/strokeTypes';
import { useHistory } from "@liveblocks/react";

type SidebarProps = {
    currentColourRef: RefObject<string>;
}

const Sidebar = ({ currentColourRef }: SidebarProps) => {
    const tools: ([string, number, string])[] = [
        ['/icons/pencil.svg', 90, '#ffffff'],
        ['/icons/crayon.svg', 270, '#edd973']
    ];

    const [currentTool, setCurrentTool] = useState<number>(0);
    const [hoveredTool, setHoveredTool] = useState<number | null>(null);

    const { undo, redo } = useHistory();

    return (
        <div className="fixed right-(--gap) top-1/2 -translate-y-1/2 flex flex-col gap-(--gap)">
            <div
                className={cn(
                    'card-style flex flex-col gap-(--padding) p-(--padding) items-end',
                    'w-[calc(110px+var(--padding)*2)]'
                )}
            >
                {tools.map((tool, index) => (
                    <motion.div
                        key={index}
                        onClick={() => {
                            setCurrentTool(index);
                            currentColourRef.current = tool[2];
                        }}
                        className="h-18 w-[110px] relative cursor-pointer overflow-hidden p-(--padding)"
                        animate={{
                            width: currentTool === index ? 145 : hoveredTool === index ? 125 : 110
                        }}
                        transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 25,
                        }}
                        onHoverStart={() => setHoveredTool(index)}
                        onHoverEnd={() => setHoveredTool(null)}
                    >
                        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-[145px] h-18">
                            <Image
                                src={tool[0]}
                                alt="tool"
                                width={0}
                                height={0}
                                className="w-full h-full scale-210"
                                style={{
                                    rotate: `${tool[1]}deg`
                                }}
                            />
                        </div>
                    </motion.div>
                ))}
                <div className="flex justify-evenly w-full mt-(--padding) items-center">
                    <button
                        className="w-14 h-14 cursor-pointer flex justify-center items-center"
                        onClick={() => undo()}
                    >
                        <Image
                            src={'/icons/undo.svg'}
                            alt="undo arrow"
                            width={0}
                            height={0}
                            className="w-7/10 h-7/10"
                        />
                    </button>
                    <div className="h-8 w-0.75 rounded-full bg-(--arrow-color)" />
                    <button
                        className="w-14 h-14 cursor-pointer flex justify-center items-center"
                        onClick={() => redo()}
                    >
                        <Image
                            src={'/icons/undo.svg'}
                            alt="undo arrow"
                            width={0}
                            height={0}
                            className="w-7/10 h-7/10 scale-x-[-1]"
                        />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Sidebar