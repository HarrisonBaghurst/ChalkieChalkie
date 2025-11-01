'use client'

import React, { useEffect, useRef, useState } from 'react'

type Point = {
    x: number;
    y: number;
}

const Board = () => {
    // persistant reference to canvas 
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
    const [strokes, setStrokes] = useState<Point[][]>([]);

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
                handleDelete();
            }
        }
        window.addEventListener("keydown", handleKeyDown);

        // clean up on unmount 
        return () => window.removeEventListener("keydown", handleKeyDown);

    }, [])

    // update the canvas upon mouse up 
    useEffect(() => {
        console.log(strokes);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height) 
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        for (const stroke of strokes) {
            ctx.beginPath();
            stroke.forEach((point, index) => {
                if (index === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
        }

    }, [strokes]); 

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDrawing(true);
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const point = { x: e.clientX - rect.left, y: e.clientY - rect.top};
        setCurrentStroke([point]);
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing) return; 
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const point = { x: e.clientX - rect.left, y: e.clientY - rect.top};
        setCurrentStroke((prev) => [...prev, point]);
    }

    const handleMouseUp = () => { 
        if (!isDrawing) return; 
        setIsDrawing(false);    
        setStrokes((prev) => [...prev, currentStroke]);
        setCurrentStroke([]);
    }

    const handleDelete = () => {
        setStrokes((prev) => prev.slice(0, -1));
    }
    
    return (
        <canvas 
        ref={canvasRef}        
        className='cursor-crosshair w-full h-full'
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        />
    )
}

export default Board