'use client'

import drawToCanvas from '@/lib/canvasDrawing';
import { handleMouseDown, handleMouseMove, handleMouseUp } from '@/lib/canvasInputs';
import { Stroke } from '@/types/strokeTypes';
import React, { useEffect, useRef, useState } from 'react'

const Board = () => {
    // reference to canvas - applies to html component
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // tool information 
    const [isToolDown, setIsToolDown] = useState(false);

    // strokes information 
    const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentColour, setCurrentColour] = useState('#ffffff')

    useEffect(() => {
        drawToCanvas({ strokes, currentStroke, canvasRef });
    }, [strokes, currentStroke])

    return (
        <canvas 
        ref={canvasRef}
        className='w-screen h-screen graph-paper'
        onMouseDown={(e) => handleMouseDown({ e, currentColour, setCurrentStroke, setIsToolDown })}
        onMouseMove={(e) => handleMouseMove({ e, setCurrentStroke, isToolDown })}
        onMouseUp={() => handleMouseUp({ isToolDown, setIsToolDown, currentStroke, setCurrentStroke, setStrokes })}
        />
    )
}

export default Board