'use client'

import { RefObject, useState } from "react";
import { motion } from 'framer-motion';
import Image from "next/image";
import { cn } from "@/lib/utils";
import { handleRedo, handleUndo } from "@/lib/canvasInputs";
import { Stroke } from '@/types/strokeTypes';

type SidebarProps = {
    currentColourRef: RefObject<string>;
    strokesRef: RefObject<Stroke[]>;
    undoneStrokesRef: RefObject<Stroke[]>;
}

const Sidebar = ({ currentColourRef, strokesRef, undoneStrokesRef }: SidebarProps) => {
    const tools: ([string, number, string])[] = [
        ['/icons/pencil.svg', 90, '#ffffff'],
        ['/icons/crayon.svg', 270, '#edd973']
    ];

    const [currentTool, setCurrentTool] = useState<number>(0);

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
                        className="h-15 w-[110px] relative cursor-pointer overflow-hidden p-(--padding)"
                        animate={{
                            width: currentTool === index ? 145 : 110
                        }}
                        transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 25,
                        }}
                    >
                        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-[145px] h-15">
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
                <div className="flex justify-center w-full mt-(--padding) items-center">
                    <button
                        className="w-12 h-12 cursor-pointer flex justify-center items-center"
                        onClick={() => handleUndo({ strokesRef, undoneStrokesRef })}
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
                        className="w-12 h-12 cursor-pointer flex justify-center items-center"
                        onClick={() => handleRedo({ strokesRef, undoneStrokesRef })}
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