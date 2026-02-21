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
import { PastedImage, ResizeHandle } from "@/types/imageTypes";

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

    // image pasting
    const cursorPositionRef = useRef<Point>({ x: 0, y: 0 });
    const pastedImagesRef = useRef<PastedImage[]>([]);
    const selectedImageIdRef = useRef<string | null>(null);
    const imageDragOffsetRef = useRef<Point | null>(null);
    const activeResizeHandleRef = useRef<ResizeHandle>(null);

    // in progress stroke
    const currentStrokeRef = useRef<Stroke | null>(null);
    const isDrawingRef = useRef(false);
    const currentColourRef = useRef("#eeeeee");

    // live cursor control - all clients
    const others = useOthers();
    const [_, updateMyPresence] = useMyPresence();

    // handle pointer movement
    const handlePresenceUpdate = (e: React.MouseEvent) => {
        const x = Math.round(e.clientX - panOffsetRef.current.x);
        const y = Math.round(e.clientY - panOffsetRef.current.y);

        cursorPositionRef.current = { x, y };

        updateMyPresence({
            cursor: { x, y },
        });
    };

    // remove selections when tool changed
    const onToolChanged = () => {
        selectedImageIdRef.current = null;
        activeResizeHandleRef.current = null;
    };

    // animation loop - decoupled from React lifecycle
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const render = () => {
            drawToCanvas({
                strokes: strokes || [],
                currentStroke: currentStrokeRef.current,
                pastedImages: pastedImagesRef.current,
                canvasRef,
                panOffset: panOffsetRef.current,
                selectedImageId: selectedImageIdRef.current,
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
            } else if (event.key === "Delete" || event.key === "Backspace") {
                const id = selectedImageIdRef.current;
                if (!id) return;

                pastedImagesRef.current = pastedImagesRef.current.filter(
                    (img) => img.id !== id,
                );
                selectedImageIdRef.current = null;
            }
        };
        document.addEventListener("keydown", onKeypress);
        return () => document.removeEventListener("keydown", onKeypress);
    }, []);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (!item.type.startsWith("image/")) continue;

                const file = item.getAsFile();
                if (!file) continue;

                const reader = new FileReader();

                reader.onload = () => {
                    const img = new Image();

                    img.onload = () => {
                        const { x, y } = cursorPositionRef.current;

                        pastedImagesRef.current.push({
                            id: crypto.randomUUID(),
                            element: img,
                            x,
                            y,
                            width: img.width,
                            height: img.height,
                        });
                    };
                    img.src = reader.result as string;
                };
                reader.readAsDataURL(file);
                e.preventDefault();
                break;
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    });

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
                onToolChanged={onToolChanged}
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
                        pastedImagesRef,
                        selectedImageIdRef,
                        imageDragOffsetRef,
                        activeResizeHandleRef,
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
                        pastedImagesRef,
                        selectedImageIdRef,
                        imageDragOffsetRef,
                        activeResizeHandleRef,
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
                        pastedImagesRef,
                        selectedImageIdRef,
                        imageDragOffsetRef,
                        activeResizeHandleRef,
                    })
                }
            />
        </div>
    );
};

export default Board;
