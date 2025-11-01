import Image from 'next/image'
import React from 'react'

type ToolBarProps = {
    handleUndo: () => void;
    handleRedo: () => void;
    handleChangeColour: (colour: string) => void;
    handleSetEraser: () => void;
    handleCopy: () => void;
}

const ToolBar = ({ handleUndo, handleRedo, handleChangeColour, handleSetEraser, handleCopy }: ToolBarProps) => {
    const buttons = [
        {
            "text": "undo",
            "image": "/icons/undo.svg",
            "onClick": handleUndo,
        },
        {
            "text": "redo",
            "image": "/icons/redo.svg",
            "onClick": handleRedo,
        },
        {
            "text": "White",
            "image": "/icons/chalk-white.svg",
            "onClick": () => handleChangeColour("hsl(44,53%,74%)"),
        },
        {
            "text": "Blue",
            "image": "/icons/chalk-blue.svg",
            "onClick": () => handleChangeColour("hsl(195,19%,61%)"),
        },
        {
            "text": "Pink",
            "image": "/icons/chalk-pink.svg",
            "onClick": () => handleChangeColour('hsl(320,42%,79%)')
        },
        {
            "text": "Green",
            "image": "/icons/chalk-green.svg",
            "onClick": () => handleChangeColour('hsl(108,22%,60%)')
        },
        {
            "text": "Eraser",
            "image": "/icons/eraser.svg",
            "onClick": handleSetEraser,
        }, 
        {
            "text": "Copy",
            "image": "/icons/copy.svg",
            "onClick": handleCopy,
        }
    ]

    return (
        <div className='fixed w-fit h-fit left-1/2 -translate-x-1/2 top-[1%] card flex gap-(--gap-small)'>
            {buttons.map((button, i) => (
                <div 
                key={i} 
                className='button h-12 aspect-square relative cursor-pointer p-2'
                onClick={button.onClick}
                >
                    {button.image? (
                        <Image 
                        src={button.image}
                        width={0}
                        height={0}
                        alt={button.text}
                        className='w-full h-full'
                        />
                    ): (
                        <div>
                            {button.text}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}

export default ToolBar
