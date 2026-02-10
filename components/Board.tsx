"use client";

import { useEffect, useRef } from "react";
import drawToCanvas from "@/lib/canvasDrawing";
import {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
} from "@/lib/canvasInputs";
import { Point, Stroke } from "@/types/strokeTypes";
import BottomBar from "./BottomBar";
import {
    useHistory,
    useMutation,
    useMyPresence,
    useOthers,
    useStorage,
} from "@liveblocks/react";
import Cursor from "./Cursor";
import { Tools } from "@/types/toolTypes";

const Board = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const currentToolRef = useRef<Tools>("pen");

    // liveblocks storage - sync accross clients
    const strokes = useStorage((root) => root.canvasStrokes);
    const { undo, redo } = useHistory();

    // use mutations to updated liveblocks storage
    const addStroke = useMutation(({ storage }, stroke: Stroke) => {
        storage.get("canvasStrokes").push(stroke);
    }, []);
    const eraseStrokes = useMutation(({ storage }, strokeIds: string[]) => {
        const strokes = storage.get("canvasStrokes");
        for (let i = strokes.length - 1; i >= 0; i--) {
            if (strokeIds.includes(strokes.get(i)!.id)) {
                strokes.delete(i);
            }
        }
    }, []);

    // panning control
    const panOffsetRef = useRef<Point>({ x: 0, y: 0 });
    const lastPanOffsetRef = useRef<Point>({ x: 0, y: 0 });
    const panStartRef = useRef<Point | null>(null);

    // in progress stroke
    const currentStrokeRef = useRef<Stroke | null>(null);
    const isDrawingRef = useRef(false);
    const currentColourRef = useRef("#eeeeee");

    // live cursor control - all clients
    const others = useOthers();
    const [_, updateMyPresence] = useMyPresence();

    // handle pointer movement
    const handlePresenceUpdate = (e: React.MouseEvent) => {
        updateMyPresence({
            cursor: {
                x: Math.round(e.clientX - panOffsetRef.current.x),
                y: Math.round(e.clientY - panOffsetRef.current.y),
            },
        });
    };

    // animation loop - decoupled from React lifecycle
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const render = () => {
            drawToCanvas({
                strokes: strokes || [],
                currentStroke: currentStrokeRef.current,
                canvasRef,
                panOffset: panOffsetRef.current,
            });

            if (canvasRef.current) {
                const { x, y } = panOffsetRef.current;
                canvas.style.backgroundPosition = `${x}px ${y}px`;
            }

            requestAnimationFrame(render);
        };
        const frameId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(frameId);
    }, [strokes]); // re-run if strokes changes

    // prevent context menu when right-clicking to pan
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const preventContextMenu = (e: MouseEvent) => e.preventDefault();
        canvas.addEventListener("contextmenu", preventContextMenu);
        return () =>
            canvas.removeEventListener("contextmenu", preventContextMenu);
    }, []);

    // create event listeners for keybinds
    useEffect(() => {
        const onKeypress = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.key === "z") {
                event.preventDefault();
                undo();
            } else if (event.ctrlKey && event.key === "y") {
                event.preventDefault();
                redo();
            }
        };
        document.addEventListener("keydown", onKeypress);
        return () => document.removeEventListener("keydown", onKeypress);
    });

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    return (
        <div className="w-dvw h-dvh overflow-hidden">
            {others.map(({ connectionId, presence }) => {
                if (!presence?.cursor) return null;
                return (
                    <Cursor
                        key={connectionId}
                        x={presence.cursor.x}
                        y={presence.cursor.y}
                        color="#eb7a38"
                    />
                );
            })}
            <BottomBar
                currentColourRef={currentColourRef}
                currentToolRef={currentToolRef}
            />
            <canvas
                ref={canvasRef}
                className="w-screen h-screen dotted-paper overflow-hidden"
                onMouseDown={(e) =>
                    handleMouseDown({
                        e,
                        currentColourRef,
                        currentStrokeRef,
                        isDrawingRef,
                        panStartRef,
                        lastPanOffsetRef,
                        currentToolRef,
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
                        currentToolRef,
                        strokes,
                        onErase: eraseStrokes,
                    });
                    handlePresenceUpdate(e);
                }}
                onMouseUp={(e) =>
                    handleMouseUp({
                        e,
                        isDrawingRef,
                        currentStrokeRef,
                        panStartRef,
                        lastPanOffsetRef,
                        panOffsetRef,
                        currentToolRef,
                        onStrokeFinished: addStroke,
                    })
                }
            />
        </div>
    );
};

export default Board;
