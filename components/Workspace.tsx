"use client";

import {
    RefObject,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Point } from "@/types/strokeTypes";
import { HIGHLIGHT_COLOURS, PEN_COLOURS } from "@/lib/colours";
import { useMyPresence } from "@liveblocks/react";
import { toolCursorMap, Tools } from "@/types/toolTypes";
import { CanvasState, ToolCallbacks } from "@/types/canvasStateTypes";
import { useLiveWorkspace } from "@/hooks/useLiveWorkspace";
import { useCanvasRenderLoop } from "@/hooks/useCanvasRenderLoop";
import { useImagePaste, usePastedImagesSync } from "@/hooks/useImagePaste";
import { useKeybinds } from "@/hooks/useKeybinds";
import CursorLayer from "./CursorLayer";
import ParticipantRoster from "./ParticipantRoster";
import { handleMouseDown } from "@/lib/handlers/mouseDown";
import { handleMouseMove } from "@/lib/handlers/mouseMove";
import { handleMouseUp } from "@/lib/handlers/mouseUp";
import { getMousePos } from "@/lib/handlers/helpers";
import FullscreenLoader from "./FullscreenLoader";
import BoardHeader from "./BoardHeader";
import Toolbar from "./Toolbar";

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4.0;
const ZOOM_RATIO = 1.1;

const Workspace = ({ workspaceId }: { workspaceId: string }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

    // single source of truth for all mutable canvas interaction state — tools,
    // drawing, selection, images and the camera (viewport) all live here so
    // handlers receive one ref instead of ~20 individual ones
    const canvasStateRef = useRef<CanvasState>({
        viewport: { offset: { x: 0, y: 0 }, zoom: 1 },
        panOrigin: null,
        lastMouseScreen: null,
        currentStroke: null,
        isDrawing: false,
        currentColour: PEN_COLOURS[0].code,
        highlightColour: HIGHLIGHT_COLOURS[0].code,
        tool: "pen",
        cursorPosition: { x: 0, y: 0 },
        selectedImageId: null,
        imageDragOffset: null,
        activeResizeHandle: null,
        pastedImages: [],
        selectorRect: null,
        selectorRectOrigin: null,
        selectorStart: null,
        selectedStrokeIds: [],
        selectedImageIds: [],
        selectorDragStart: null,
        selectorDelta: { x: 0, y: 0 },
        selectorImageOrigins: new Map(),
    });

    // reactive tool, drives cursor styling + Sidebar active highlight
    const [currentTool, setCurrentTool] = useState<Tools>("pen");

    // thin RefObject adapters so the Sidebar/ColourSelector subtree can read and
    // write the colours that live inside canvasStateRef (one source of truth)
    const currentColourRef = useMemo<RefObject<string>>(
        () => ({
            get current() {
                return canvasStateRef.current.currentColour;
            },
            set current(value: string) {
                canvasStateRef.current.currentColour = value;
            },
        }),
        [],
    );
    const highlightColourRef = useMemo<RefObject<string>>(
        () => ({
            get current() {
                return canvasStateRef.current.highlightColour;
            },
            set current(value: string) {
                canvasStateRef.current.highlightColour = value;
            },
        }),
        [],
    );

    // Liveblocks mutations handed to the tool strategies
    const callbacks = useMemo<ToolCallbacks>(
        () => ({
            onErase: eraseStrokes,
            onStrokeFinished: addStroke,
            onImageMoved: (id, changes) => updateImageMeta(id, changes),
            onMoveStrokes: moveStrokes,
        }),
        [eraseStrokes, addStroke, updateImageMeta, moveStrokes],
    );

    // live presence
    const [_, updateMyPresence] = useMyPresence();

    const handlePresenceUpdate = (e: React.MouseEvent) => {
        const { x: sx, y: sy } = getMousePos(e);
        const { offset, zoom } = canvasStateRef.current.viewport;
        const x = Math.round((sx - offset.x) / zoom);
        const y = Math.round((sy - offset.y) / zoom);
        canvasStateRef.current.cursorPosition = { x, y };
        updateMyPresence({ cursor: { x, y } });
    };

    const canvasCenter = (): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return { x: rect.width / 2, y: rect.height / 2 };
    };

    const applyZoom = (rawZoom: number, anchor: Point) => {
        const vp = canvasStateRef.current.viewport;
        const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, rawZoom));
        const old = vp.zoom;
        if (newZoom === old) return;
        const ratio = newZoom / old;
        vp.offset = {
            x: anchor.x - ratio * (anchor.x - vp.offset.x),
            y: anchor.y - ratio * (anchor.y - vp.offset.y),
        };
        vp.zoom = newZoom;
    };

    const zoomIn = useCallback(() => {
        const anchor = canvasStateRef.current.lastMouseScreen ?? canvasCenter();
        applyZoom(canvasStateRef.current.viewport.zoom * ZOOM_RATIO, anchor);
    }, []);

    const zoomOut = useCallback(() => {
        const anchor = canvasStateRef.current.lastMouseScreen ?? canvasCenter();
        applyZoom(canvasStateRef.current.viewport.zoom / ZOOM_RATIO, anchor);
    }, []);

    // clear selection state on tool change
    const onToolChanged = (tool: Tools) => {
        setCurrentTool(tool);
        const state = canvasStateRef.current;
        state.tool = tool;
        state.selectedImageId = null;
        state.activeResizeHandle = null;
        state.selectorRect = null;
        state.selectorRectOrigin = null;
        state.selectorStart = null;
        state.selectedStrokeIds = [];
        state.selectedImageIds = [];
        state.selectorDragStart = null;
        state.selectorDelta = { x: 0, y: 0 };
        state.selectorImageOrigins.clear();
    };

    // hooks
    useCanvasRenderLoop({ canvasRef, canvasStateRef, strokes });

    usePastedImagesSync({ canvasStateRef, pastedImagesMeta });

    useImagePaste({ workspaceId, canvasStateRef, addImageMeta });

    useKeybinds({
        canvasStateRef,
        removeImageMeta,
        undo,
        redo,
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
            applyZoom(canvasStateRef.current.viewport.zoom * factor, anchor);
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
                    <CursorLayer canvasStateRef={canvasStateRef} />
                    <BoardHeader />
                    <ParticipantRoster />
                    <Toolbar
                        currentTool={currentTool}
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
                        onMouseDown={(e) => {
                            // the canvas handler calls preventDefault, which
                            // suppresses the browser's implicit blur of a
                            // focused element (e.g. the title input). Blur it
                            // manually so inline edits commit before drawing.
                            if (
                                document.activeElement instanceof HTMLElement
                            ) {
                                document.activeElement.blur();
                            }
                            handleMouseDown({
                                e,
                                canvasStateRef,
                                strokes,
                                callbacks,
                            });
                        }}
                        onMouseMove={(e) => {
                            handleMouseMove({
                                e,
                                canvasStateRef,
                                strokes,
                                callbacks,
                            });
                            handlePresenceUpdate(e);
                            canvasStateRef.current.lastMouseScreen =
                                getMousePos(e);
                        }}
                        onMouseUp={(e) =>
                            handleMouseUp({
                                e,
                                canvasStateRef,
                                strokes,
                                callbacks,
                            })
                        }
                    />
                </div>
            ) : (
                <FullscreenLoader />
            )}
        </>
    );
};

export default Workspace;
