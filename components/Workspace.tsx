"use client";

import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { HIGHLIGHT_COLOURS, PEN_COLOURS } from "@/lib/colours";
import { Tools } from "@/types/toolTypes";
import { CanvasState, ToolCallbacks } from "@/types/canvasStateTypes";
import { useLiveWorkspace } from "@/hooks/useLiveWorkspace";
import { useCanvasInput } from "@/hooks/useCanvasInput";
import { useCanvasRenderLoop } from "@/hooks/useCanvasRenderLoop";
import { useImagePaste, usePastedImagesSync } from "@/hooks/useImagePaste";
import { useKeybinds } from "@/hooks/useKeybinds";
import { useRemoteSelections } from "@/hooks/useRemoteSelections";
import { useSelectionPresence } from "@/hooks/useSelectionPresence";
import CursorLayer from "./CursorLayer";
import ParticipantRoster from "./ParticipantRoster";
import SelectionActions from "./SelectionActions";
import FullscreenLoader from "./FullscreenLoader";
import BoardHeader from "./BoardHeader";
import Toolbar from "./Toolbar";

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
        canvasRect: { left: 0, top: 0, width: 0, height: 0 },
        currentStroke: null,
        isDrawing: false,
        currentColour: PEN_COLOURS[0].code,
        highlightColour: HIGHLIGHT_COLOURS[0].code,
        tool: "pen",
        cursorPosition: { x: 0, y: 0 },
        selectedImageId: null,
        imageDragOffset: null,
        activeResizeHandle: null,
        imageTransformOrigin: null,
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

    const onToolChanged = (tool: Tools) => {
        setCurrentTool(tool);
        const state = canvasStateRef.current;
        state.tool = tool;
        state.selectedImageId = null;
        state.activeResizeHandle = null;
        state.imageTransformOrigin = null;
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

    useCanvasInput({
        canvasRef,
        canvasStateRef,
        strokes,
        callbacks,
        enabled: isLoaded,
    });

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
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    return (
        <>
            {isLoaded ? (
                <div className="w-dvw h-dvh overflow-hidden select-none [-webkit-touch-callout:none]">
                    <CursorLayer canvasStateRef={canvasStateRef} />
                    <SelectionActions
                        canvasStateRef={canvasStateRef}
                        strokes={strokes}
                        eraseStrokes={eraseStrokes}
                        removeImageMeta={removeImageMeta}
                    />
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
                        className="w-full h-full dotted-paper overflow-hidden touch-none select-none overscroll-none [-webkit-touch-callout:none]"
                    />
                </div>
            ) : (
                <FullscreenLoader />
            )}
        </>
    );
};

export default Workspace;
