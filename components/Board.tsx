'use client';

import React, { useEffect, useRef } from 'react';
import drawToCanvas from '@/lib/canvasDrawing';
import { handleMouseDown, handleMouseMove, handleMouseUp, handleUndo } from '@/lib/canvasInputs';
import { Point, Stroke } from '@/types/strokeTypes';

const Board = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // refs for mutable data
    const strokesRef = useRef<Stroke[]>([]);
    const currentStrokeRef = useRef<Stroke | null>(null);
    const panOffsetRef = useRef<Point>({ x: 0, y: 0 });
    const lastPanOffsetRef = useRef<Point>({ x: 0, y: 0 });
    const panStartRef = useRef<Point | null>(null);
    const isDrawingRef = useRef(false);
    const currentColourRef = useRef('#ffffff');

    // animation loop - decoupled from React lifecycle
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const render = () => {
            drawToCanvas({
                strokes: strokesRef.current,
                currentStroke: currentStrokeRef.current,
                canvasRef,
                panOffset: panOffsetRef.current,
            });

            const { x, y } = panOffsetRef.current;
            canvas.style.backgroundPosition = `${x}px ${y}px`;

            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    }, []);

    // prevent context menu when right-clicking to pan
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const preventContextMenu = (e: MouseEvent) => e.preventDefault();
        canvas.addEventListener('contextmenu', preventContextMenu);
        return () => canvas.removeEventListener('contextmenu', preventContextMenu);
    }, []);

    // create event listeners for keybinds 
    useEffect(() => {
        const onKeypress = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.key === 'z') {
                event.preventDefault();
                handleUndo({ strokesRef });
            }
        }
        document.addEventListener('keydown', onKeypress);
        return () => document.removeEventListener('keydown', onKeypress);
    })

    return (
        <canvas
            ref={canvasRef}
            className="w-screen h-screen graph-paper"
            onMouseDown={(e) =>
                handleMouseDown({
                    e,
                    currentColourRef,
                    currentStrokeRef,
                    isDrawingRef,
                    panStartRef,
                    lastPanOffsetRef,
                })
            }
            onMouseMove={(e) =>
                handleMouseMove({
                    e,
                    currentStrokeRef,
                    isDrawingRef,
                    panStartRef,
                    panOffsetRef,
                    lastPanOffsetRef,
                })
            }
            onMouseUp={(e) =>
                handleMouseUp({
                    e,
                    isDrawingRef,
                    currentStrokeRef,
                    strokesRef,
                    panStartRef,
                    lastPanOffsetRef,
                    panOffsetRef,
                })
            }
        />
    );
};

export default Board;
