"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Point, Stroke } from "@/types/strokeTypes";
import { HIGHLIGHT_COLOURS } from "@/lib/highlightColours";
import Sidebar from "./Sidebar";
import { useMyPresence } from "@liveblocks/react";
import { toolCursorMap, Tools } from "@/types/toolTypes";
import { PastedImage, ResizeHandle } from "@/types/imageTypes";
import { Rect } from "@/lib/genometry";
import { useLiveWorkspace } from "@/hooks/useLiveWorkspace";
import { useCanvasRenderLoop } from "@/hooks/useCanvasRenderLoop";
import { useImagePaste, usePastedImagesSync } from "@/hooks/useImagePaste";
import { useKeybinds } from "@/hooks/useKeybinds";
import CursorLayer from "./CursorLayer";
import { handleMouseDown } from "@/lib/handlers/mouseDown";
import { handleMouseMove } from "@/lib/handlers/mouseMove";
import { handleMouseUp } from "@/lib/handlers/mouseUp";
import { getMousePos } from "@/lib/handlers/helpers";
import FullscreenLoader from "./FullscreenLoader";
import WorkspaceTopbar from "./WorkspaceTopbar";

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4.0;
const ZOOM_RATIO = 1.1;

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
        moveStrokes,
    } = useLiveWorkspace();

    const isLoaded = strokes !== null;

    // local image element cache
    const pastedImagesRef = useRef<PastedImage[]>([]);

    // panning refs
    const panOffsetRef = useRef<Point>({ x: 0, y: 0 });
    const lastPanOffsetRef = useRef<Point>({ x: 0, y: 0 });
    const panStartRef = useRef<Point | null>(null);

    // zoom state
    const zoomRef = useRef<number>(1);
    const [zoom, setZoom] = useState<number>(1);
    const lastMouseScreenRef = useRef<Point | null>(null);

    // pan state mirror — synced from panOffsetRef on pan end + applyZoom, used to redraw remote cursors
    const [panOffsetState, setPanOffsetState] = useState<Point>({ x: 0, y: 0 });

    // image interaction refs
    const cursorPositionRef = useRef<Point>({ x: 0, y: 0 });
    const selectedImageIdRef = useRef<string | null>(null);
    const imageDragOffsetRef = useRef<Point | null>(null);
    const activeResizeHandleRef = useRef<ResizeHandle>(null);

    // drawing refs
    const currentStrokeRef = useRef<Stroke | null>(null);
    const isDrawingRef = useRef(false);
    const currentColourRef = useRef("#eeeeee");
    const highlightColourRef = useRef<string>(HIGHLIGHT_COLOURS[0]);

    // selector refs
    const selectorRectRef = useRef<Rect | null>(null);
    const selectorRectOriginRef = useRef<Rect | null>(null);
    const selectorStartRef = useRef<Point | null>(null);
    const selectedStrokeIdsRef = useRef<string[]>([]);
    const selectedImageIdsRef = useRef<string[]>([]);
    const selectorDragStartRef = useRef<Point | null>(null);
    const selectorDeltaRef = useRef<Point>({ x: 0, y: 0 });
    const selectorImageOriginsRef = useRef<Map<string, Point>>(new Map());

    // cursor image state
    const [currentTool, setCurrentTool] = useState<Tools>("pen");

    // live presence
    const [_, updateMyPresence] = useMyPresence();

    const handlePresenceUpdate = (e: React.MouseEvent) => {
        const { x: sx, y: sy } = getMousePos(e);
        const x = Math.round((sx - panOffsetRef.current.x) / zoomRef.current);
        const y = Math.round((sy - panOffsetRef.current.y) / zoomRef.current);
        cursorPositionRef.current = { x, y };
        updateMyPresence({ cursor: { x, y } });
    };

    const canvasCenter = (): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return { x: rect.width / 2, y: rect.height / 2 };
    };

    const applyZoom = (rawZoom: number, anchor: Point) => {
        const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, rawZoom));
        const old = zoomRef.current;
        if (newZoom === old) return;
        const ratio = newZoom / old;
        const p = panOffsetRef.current;
        panOffsetRef.current = {
            x: anchor.x - ratio * (anchor.x - p.x),
            y: anchor.y - ratio * (anchor.y - p.y),
        };
        lastPanOffsetRef.current = { ...panOffsetRef.current };
        zoomRef.current = newZoom;
        setZoom(newZoom);
        setPanOffsetState({ ...panOffsetRef.current });
    };

    const zoomIn = useCallback(() => {
        const anchor = lastMouseScreenRef.current ?? canvasCenter();
        applyZoom(zoomRef.current * ZOOM_RATIO, anchor);
    }, []);

    const zoomOut = useCallback(() => {
        const anchor = lastMouseScreenRef.current ?? canvasCenter();
        applyZoom(zoomRef.current / ZOOM_RATIO, anchor);
    }, []);

    // clear selection state on tool change
    const onToolChanged = (tool: Tools) => {
        setCurrentTool(tool);
        currentToolRef.current = tool;
        selectedImageIdRef.current = null;
        activeResizeHandleRef.current = null;
        selectorRectRef.current = null;
        selectorRectOriginRef.current = null;
        selectorStartRef.current = null;
        selectedStrokeIdsRef.current = [];
        selectedImageIdsRef.current = [];
        selectorDragStartRef.current = null;
        selectorDeltaRef.current = { x: 0, y: 0 };
        selectorImageOriginsRef.current.clear();
    };

    // hooks
    useCanvasRenderLoop({
        canvasRef,
        strokes,
        currentStrokeRef,
        pastedImagesRef,
        panOffsetRef,
        zoomRef,
        selectedImageIdRef,
        selectorRectRef,
        selectedStrokeIdsRef,
        selectedImageIdsRef,
        selectorDeltaRef,
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
        selectedStrokeIdsRef,
        selectedImageIdsRef,
        selectorRectRef,
        eraseStrokes,
    });

    // prevent right click context menu on canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const preventContextMenu = (e: MouseEvent) => e.preventDefault();
        canvas.addEventListener("contextmenu", preventContextMenu);
        return () =>
            canvas.removeEventListener("contextmenu", preventContextMenu);
    }, [isLoaded]);

    // wheel handler — native listener so we can preventDefault (React's onWheel is passive)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const anchor = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };
            const factor = e.deltaY < 0 ? ZOOM_RATIO : 1 / ZOOM_RATIO;
            applyZoom(zoomRef.current * factor, anchor);
        };
        canvas.addEventListener("wheel", onWheel, { passive: false });
        return () => canvas.removeEventListener("wheel", onWheel);
    }, [isLoaded]);

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
                    <CursorLayer zoom={zoom} panOffset={panOffsetState} />
                    <WorkspaceTopbar />
                    <Sidebar
                        currentTool={currentToolRef.current}
                        currentColourRef={currentColourRef}
                        highlightColourRef={highlightColourRef}
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
                                highlightColourRef,
                                currentStrokeRef,
                                isDrawingRef,
                                panStartRef,
                                lastPanOffsetRef,
                                zoomRef,
                                currentToolRef,
                                strokes,
                                pastedImagesRef,
                                selectedImageIdRef,
                                imageDragOffsetRef,
                                activeResizeHandleRef,
                                selectorRectRef,
                                selectorRectOriginRef,
                                selectorStartRef,
                                selectedStrokeIdsRef,
                                selectedImageIdsRef,
                                selectorDragStartRef,
                                selectorDeltaRef,
                                selectorImageOriginsRef,
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
                                zoomRef,
                                currentToolRef,
                                strokes,
                                onErase: eraseStrokes,
                                pastedImagesRef,
                                selectedImageIdRef,
                                imageDragOffsetRef,
                                activeResizeHandleRef,
                                selectorRectRef,
                                selectorRectOriginRef,
                                selectorStartRef,
                                selectedImageIdsRef,
                                selectorDragStartRef,
                                selectorDeltaRef,
                                selectorImageOriginsRef,
                            });
                            handlePresenceUpdate(e);
                            lastMouseScreenRef.current = getMousePos(e);
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
                                strokes,
                                onStrokeFinished: addStroke,
                                pastedImagesRef,
                                selectedImageIdRef,
                                imageDragOffsetRef,
                                activeResizeHandleRef,
                                onImageMoved: (id, changes) =>
                                    updateImageMeta(id, changes),
                                selectorRectRef,
                                selectorStartRef,
                                selectedStrokeIdsRef,
                                selectedImageIdsRef,
                                selectorDragStartRef,
                                selectorDeltaRef,
                                selectorImageOriginsRef,
                                onMoveStrokes: moveStrokes,
                            });
                            if (e.button === 2) {
                                setPanOffsetState({ ...panOffsetRef.current });
                            }
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
