"use client";

import { useEffect, useRef, useState } from "react";
import { Point, Stroke } from "@/types/strokeTypes";
import Sidebar from "./Sidebar";
import { useMyPresence } from "@liveblocks/react";
import { toolCursorMap, Tools } from "@/types/toolTypes";
import { PastedImage, ResizeHandle } from "@/types/imageTypes";
import { useLiveWorkspace } from "@/hooks/useLiveWorkspace";
import { useCanvasRenderLoop } from "@/hooks/useCanvasRenderLoop";
import { useImagePaste, usePastedImagesSync } from "@/hooks/useImagePaste";
import { useKeybinds } from "@/hooks/useKeybinds";
import CursorLayer from "./CursorLayer";
import { handleMouseDown } from "@/lib/handlers/mouseDown";
import { handleMouseMove } from "@/lib/handlers/mouseMove";
import { handleMouseUp } from "@/lib/handlers/mouseUp";
import FullscreenLoader from "./FullscreenLoader";

const Workspace = ({ workspaceId }: { workspaceId: string }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const currentToolRef = useRef<Tools>("pen");

    // Liveblocks state and mutations
    const {
        strokes,
        pastedImagesMeta,
        undo,
        redo,
        addStroke,
        eraseStrokes,
        addImageMeta,
        removeImageMeta,
        updateImageMeta,
    } = useLiveWorkspace();

    const isLoaded = strokes !== null;

    // local image element cache
    const pastedImagesRef = useRef<PastedImage[]>([]);

    // panning refs
    const panOffsetRef = useRef<Point>({ x: 0, y: 0 });
    const lastPanOffsetRef = useRef<Point>({ x: 0, y: 0 });
    const panStartRef = useRef<Point | null>(null);

    // image interaction refs
    const cursorPositionRef = useRef<Point>({ x: 0, y: 0 });
    const selectedImageIdRef = useRef<string | null>(null);
    const imageDragOffsetRef = useRef<Point | null>(null);
    const activeResizeHandleRef = useRef<ResizeHandle>(null);

    // drawing refs
    const currentStrokeRef = useRef<Stroke | null>(null);
    const isDrawingRef = useRef(false);
    const currentColourRef = useRef("#eeeeee");

    // cursor image state
    const [currentTool, setCurrentTool] = useState<Tools>("pen");

    // live presence
    const [_, updateMyPresence] = useMyPresence();

    const handlePresenceUpdate = (e: React.MouseEvent) => {
        const x = Math.round(e.clientX - panOffsetRef.current.x);
        const y = Math.round(e.clientY - panOffsetRef.current.y);
        cursorPositionRef.current = { x, y };
        updateMyPresence({ cursor: { x, y } });
    };

    // clear image selection on tool chagne
    const onToolChanged = (tool: Tools) => {
        setCurrentTool(tool);
        currentToolRef.current = tool;
        selectedImageIdRef.current = null;
        activeResizeHandleRef.current = null;
    };

    // hooks
    useCanvasRenderLoop({
        canvasRef,
        strokes,
        currentStrokeRef,
        pastedImagesRef,
        panOffsetRef,
        selectedImageIdRef,
    });

    usePastedImagesSync({ pastedImagesRef, pastedImagesMeta });

    useImagePaste({
        workspaceId,
        cursorPositionRef,
        pastedImagesRef,
        addImageMeta,
    });

    useKeybinds({
        workspaceId,
        selectedImageIdRef,
        pastedImagesRef,
        removeImageMeta,
        undo,
        redo,
    });

    // prevent right click context menu on canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const preventContextMenu = (e: MouseEvent) => e.preventDefault();
        canvas.addEventListener("contextmenu", preventContextMenu);
        return () =>
            canvas.removeEventListener("contextmenu", preventContextMenu);
    }, []);

    // lock body scroll when board is mounted
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    return (
        <>
            {isLoaded ? (
                <div className="w-dvw h-dvh overflow-hidden">
                    <CursorLayer />
                    <Sidebar
                        currentTool={currentToolRef.current}
                        currentColourRef={currentColourRef}
                        onToolChanged={onToolChanged}
                    />
                    <canvas
                        ref={canvasRef}
                        style={{
                            pointerEvents: isLoaded ? "auto" : "none",
                            cursor: toolCursorMap[currentTool],
                        }}
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
                        onMouseUp={(e) => {
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
                                onImageMoved: (id, changes) =>
                                    updateImageMeta(id, changes),
                            });
                        }}
                    />
                </div>
            ) : (
                <FullscreenLoader />
            )}
        </>
    );
};

export default Workspace;
