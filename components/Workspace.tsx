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
import { useUpdateMyPresence } from "@liveblocks/react";
import { Tools } from "@/types/toolTypes";
import { CanvasState, ToolCallbacks } from "@/types/canvasStateTypes";
import { useLiveWorkspace } from "@/hooks/useLiveWorkspace";
import { useCanvasRenderLoop } from "@/hooks/useCanvasRenderLoop";
import { useImagePaste, usePastedImagesSync } from "@/hooks/useImagePaste";
import { useKeybinds } from "@/hooks/useKeybinds";
import { useRemoteSelections } from "@/hooks/useRemoteSelections";
import { useSelectionPresence } from "@/hooks/useSelectionPresence";
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

    // One ref for every piece of mutable canvas state, so handlers take one
    // argument instead of twenty.
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
        marqueeRect: null,
        selectionBounds: null,
        selectionBoundsOrigin: null,
        selectorStart: null,
        selectedStrokeIds: [],
        selectedImageIds: [],
        selectorDragStart: null,
        selectorDelta: { x: 0, y: 0 },
        selectorImageOrigins: new Map(),
        lockedStrokeIds: new Set(),
        lockedImageIds: new Set(),
    });

    // Mirrored as state so cursor styling and the toolbar highlight re-render.
    const [currentTool, setCurrentTool] = useState<Tools>("pen");

    // Adapters so the toolbar subtree reads and writes the colours that live
    // inside canvasStateRef rather than keeping a second copy.
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

    const callbacks = useMemo<ToolCallbacks>(
        () => ({
            onErase: eraseStrokes,
            onStrokeFinished: addStroke,
            onImageMoved: (id, changes) => updateImageMeta(id, changes),
            onMoveStrokes: moveStrokes,
        }),
        [eraseStrokes, addStroke, updateImageMeta, moveStrokes],
    );

    const updateMyPresence = useUpdateMyPresence();

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

    const onToolChanged = (tool: Tools) => {
        setCurrentTool(tool);
        const state = canvasStateRef.current;
        state.tool = tool;
        state.selectedImageId = null;
        state.activeResizeHandle = null;
        state.marqueeRect = null;
        state.selectionBounds = null;
        state.selectionBoundsOrigin = null;
        state.selectorStart = null;
        state.selectedStrokeIds = [];
        state.selectedImageIds = [];
        state.selectorDragStart = null;
        state.selectorDelta = { x: 0, y: 0 };
        state.selectorImageOrigins.clear();
    };

    const remoteSelectionsRef = useRemoteSelections(canvasStateRef);

    useSelectionPresence({ canvasStateRef, strokes, pastedImagesMeta });

    useCanvasRenderLoop({
        canvasRef,
        canvasStateRef,
        strokes,
        remoteSelectionsRef,
    });

    usePastedImagesSync({ canvasStateRef, pastedImagesMeta });

    useImagePaste({ workspaceId, canvasStateRef, addImageMeta });

    useKeybinds({
        canvasStateRef,
        removeImageMeta,
        undo,
        redo,
        eraseStrokes,
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const preventContextMenu = (e: MouseEvent) => e.preventDefault();
        canvas.addEventListener("contextmenu", preventContextMenu);
        return () =>
            canvas.removeEventListener("contextmenu", preventContextMenu);
    }, [isLoaded]);

    // Native listener so preventDefault works — React's onWheel is passive.
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
                        }}
                        className="w-screen h-screen dotted-paper overflow-hidden"
                        onMouseDown={(e) => {
                            // The canvas preventDefault suppresses the implicit
                            // blur, so commit inline edits by hand.
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
