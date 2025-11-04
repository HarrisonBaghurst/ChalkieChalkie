'use client'

import React, { useState } from 'react'
import Dock from './ui/Dock';
import Image from 'next/image';

type ToolBarProps = {
    handleUndo: () => void;
    handleRedo: () => void;
    handleChangeColour: (colour: string) => void;
    handleSetEraser: () => void;
    handleScreenshot: () => void;
    loadingAPI: boolean;
}

const ToolBar = ({ handleUndo, handleRedo, handleChangeColour, handleSetEraser, handleScreenshot, loadingAPI }: ToolBarProps) => {
    const selectors = [
        {
            "label": "White Chalk",
            "icon": <Image src={"/icons/chalk-white.svg"} alt='Chalk' width={0} height={0} className='w-[60%] h-[60%]' loading='eager'/>,
            "onClick": () => handleChangeColour("hsl(44,53%,74%)"),
        },
        {
            "label": "Blue Chalk",
            "icon": <Image src={"/icons/chalk-blue.svg"} alt='Chalk' width={0} height={0} className='w-[60%] h-[60%]'/>,
            "onClick": () => handleChangeColour("hsl(195,19%,61%)"),
        },
        {
            "label": "Pink Chalk",
            "icon": <Image src={"/icons/chalk-pink.svg"} alt='Chalk' width={0} height={0} className='w-[60%] h-[60%]'/>,
            "onClick": () => handleChangeColour("hsl(320,42%,79%)"),
        },
        {
            "label": "Green Chalk",
            "icon": <Image src={"/icons/chalk-green.svg"} alt='Chalk' width={0} height={0} className='w-[60%] h-[60%]'/>,
            "onClick": () => handleChangeColour("hsl(108,22%,60%)"),
        },
        {
            "label": "Board Eraser",
            "icon": <Image src={"/icons/eraser.svg"} alt='Chalk' width={0} height={0} className='w-[60%] h-[60%]'/>,
            "onClick": () => handleSetEraser(),
        },
        {
            "label": "Convert to LaTeX",
            "icon": loadingAPI? 
                <Image src={"/icons/loading-arrow.svg"} alt='Chalk' width={0} height={0} className='w-[60%] h-[60%] animate-spin'/> :
                <Image src={"/icons/screenshot.svg"} alt='Chalk' width={0} height={0} className='w-[60%] h-[60%]'/>,
            "onClick": () => handleScreenshot(),
        },
        {
            "label": "Undo",
            "icon": <Image src={"/icons/undo.svg"} alt='Chalk' width={0} height={0} className='w-[60%] h-[60%]'/>,
            "onClick": () => handleUndo(),
        },
        {
            "label": "Redo",
            "icon": <Image src={"/icons/redo.svg"} alt='Chalk' width={0} height={0} className='w-[60%] h-[60%]'/>,
            "onClick": () => handleRedo(),
        },

    ]

    return (
        <div className='fixed bottom-0 left-1/2'>
            <Dock items={selectors} />
        </div>
        
    )
}

export default ToolBar
