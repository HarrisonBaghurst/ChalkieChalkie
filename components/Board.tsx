'use client';

import { useEffect, useRef } from 'react';
import drawToCanvas from '@/lib/canvasDrawing';
import { handleMouseDown, handleMouseMove, handleMouseUp, handleUndo } from '@/lib/canvasInputs';
import { Point, Stroke } from '@/types/strokeTypes';
import Sidebar from './Sidebar';
import { useMyPresence, useOthers } from '@liveblocks/react';
import Cursor from './Cursor'

const Board = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // refs for mutable data
    const strokesRef = useRef<Stroke[]>([]);
    const undoneStrokesRef = useRef<Stroke[]>([]);
    const currentStrokeRef = useRef<Stroke | null>(null);
    const panOffsetRef = useRef<Point>({ x: 0, y: 0 });
    const lastPanOffsetRef = useRef<Point>({ x: 0, y: 0 });
    const panStartRef = useRef<Point | null>(null);
    const isDrawingRef = useRef(false);
    const currentColourRef = useRef('#ffffff');

    // liveblocks presence - cursor
    const others = useOthers();
    const [_, updateMyPresence] = useMyPresence();

    // handle pointer movement 
    const handlePresenceUpdate = (e: React.MouseEvent) => {
        updateMyPresence({
            cursor: {
                x: Math.round(e.clientX - panOffsetRef.current.x),
                y: Math.round(e.clientY - panOffsetRef.current.y)
            }
        });
    }
    const handlePointerLeave = (e: React.MouseEvent) => {
        updateMyPresence({ cursor: null })
    }

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
                handleUndo({ strokesRef, undoneStrokesRef });
            }
        }
        document.addEventListener('keydown', onKeypress);
        return () => document.removeEventListener('keydown', onKeypress);
    })

    return (
        <>
            {others.map(({ connectionId, presence }) => {
                if (!presence?.cursor) return null;
                return (
                    <Cursor
                        key={connectionId}
                        x={presence.cursor.x}
                        y={presence.cursor.y}
                        color="#3b82f6"
                    />
                );
            })}
            <Sidebar
                currentColourRef={currentColourRef}
                strokesRef={strokesRef}
                undoneStrokesRef={undoneStrokesRef}
            />
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
                onMouseMove={(e) => {
                    handleMouseMove({
                        e,
                        currentStrokeRef,
                        isDrawingRef,
                        panStartRef,
                        panOffsetRef,
                        lastPanOffsetRef,
                    });
                    handlePresenceUpdate(e)
                }}
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
                onMouseLeave={handlePointerLeave}
            />
        </>
    );
};

export default Board;
