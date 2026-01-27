'use client'

import { RefObject, useState } from "react";
import { motion } from 'framer-motion';
import Image from "next/image";
import { useHistory } from "@liveblocks/react";

type SidebarProps = {
    currentColourRef: RefObject<string>;
}

const Sidebar = ({ currentColourRef }: SidebarProps) => {
    const tools = [
        {
            'code': '#dddddd',
            'name': 'White',
        },
        {
            'code': '#ffba00',
            'name': 'Yellow',
        },
        {
            'code': '#ed482b',
            'name': 'Red',
        },
        {
            'code': '#306bc9',
            'name': 'Blue',
        },
    ];

    const [currentTool, setCurrentTool] = useState<number>(0);
    const [hoveredTool, setHoveredTool] = useState<number | null>(null);

    const { undo, redo } = useHistory();

    return (
        <div className="fixed bg-card-background rounded-[10px] right-2 top-1/2 -translate-y-1/2 p-4 overflow-hidden">
            <div className="flex gap-4 flex-col items-center">
                {tools.map((tool, index) => (
                    <motion.div
                        key={index}
                        className="w-20 h-26 relative overflow-hidden bg-white rounded-sm shadow-sm perspective-distant"
                        onHoverStart={() => setHoveredTool(index)}
                        onHoverEnd={() => setHoveredTool(null)}
                        onClick={() => {
                            setCurrentTool(index);
                            currentColourRef.current = tool.code;
                        }}
                        animate={{
                            rotateZ: currentTool === index ? -5 : hoveredTool === index ? -2 : 0
                        }}
                    >
                        <div
                            className="w-18 h-18 left-1 top-1 absolute rounded-xs"
                            style={{
                                backgroundColor: `${tool.code}`
                            }}

                        />
                        <p className="text-background text-sm absolute bottom-1 left-1 cursor-default">
                            {tool.name}
                        </p>
                    </motion.div>
                ))}
                <div className="flex justify-evenly mt-(--padding) items-center rounded-full">
                    <button
                        className="w-10 h-10 cursor-pointer flex justify-center items-center"
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
                    <div className="h-8 w-0.5 rounded-full bg-(--arrow-color)" />
                    <button
                        className="w-10 h-10 cursor-pointer flex justify-center items-center"
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