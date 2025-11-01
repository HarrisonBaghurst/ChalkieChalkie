'use client'

import React, { useEffect, useRef, useState } from 'react'
import ToolBar from './ToolBar';

type Point = {
    x: number;
    y: number;
}

type Stroke = {
    points: Point[];
    colour: string;
}

const Board = () => {
    // persistant reference to canvas 
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentColour, setCurrentColour] = useState('hsl(44,53%,74%)');

    const [removedStrokes, setRemovedStrokes] = useState<Stroke[]>([]);

    useEffect(() => {
        // dynamically set the size of the canvas to the container width
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        // add ctrl+z event listener 
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
                event.preventDefault();
                handleUndo();
            }
            else if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
                event.preventDefault();
                handleRedo();
            }
        }
        window.addEventListener("keydown", handleKeyDown);

        // clean up on unmount 
        return () => window.removeEventListener("keydown", handleKeyDown);

    }, []);

    // update canvas upon change to strokes array
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height) 
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        for (const stroke of strokes) {
            ctx.beginPath();
            ctx.strokeStyle = stroke.colour;
            if (stroke.points.length < 2) return;

            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

            for (let i = 1; i < stroke.points.length - 2; i++) {
            const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
            const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
            ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc);
            }

            // connect the last two points
            const last = stroke.points.length - 1;
            ctx.quadraticCurveTo(
            stroke.points[last - 1].x,
            stroke.points[last - 1].y,
            stroke.points[last].x,
            stroke.points[last].y
            );
            ctx.stroke();
        }

    }, [strokes]); 

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDrawing(true);
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const point = { x: e.clientX - rect.left, y: e.clientY - rect.top};
        setCurrentStroke({points:[point], colour:currentColour});
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing) return; 
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const point = { x: e.clientX - rect.left, y: e.clientY - rect.top};
        setCurrentStroke((prev) => {
            if (!prev) return null;
            return {...prev, points: [...prev.points, point] };
        });
    }

    const handleMouseUp = () => { 
        if (!isDrawing) return; 
        setIsDrawing(false);    
        if (currentStroke) {
            setStrokes((prev) => [...prev, currentStroke]);
        }
        setCurrentStroke(null);
        setRemovedStrokes([]);
    }

    const handleUndo = () => {
        setStrokes((prev) => {
            if (prev.length === 0) return prev;
            const updatedStrokes = prev.slice(0, -1);
            const lastStroke = prev[prev.length - 1];
            setRemovedStrokes((rPrev) => [...rPrev, lastStroke]);
            return updatedStrokes;
        })
    }

    const handleRedo = () => {
        setRemovedStrokes((rPrev) => {
            if (rPrev.length === 0) return rPrev;
            const updatedRemoved = rPrev.slice(0, -1);
            const lastRemovedStroke = rPrev[rPrev.length - 1];
            setStrokes((prev) => [...prev, lastRemovedStroke]);
            return updatedRemoved;
        })
    }

    const handleChangeColour = (colour: string) => {
        setCurrentColour(colour);
    }

    return (
        <>
            <ToolBar 
            handleRedo={handleRedo}
            handleUndo={handleUndo}
            handleChangeColour={handleChangeColour}
            />
            <canvas 
            ref={canvasRef}        
            className='cursor-crosshair w-full h-full'
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            />
        </>
    )
}

export default Board