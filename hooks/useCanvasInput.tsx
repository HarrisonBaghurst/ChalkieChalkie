import { RefObject, useEffect, useRef } from "react";
import { useUpdateMyPresence } from "@/hooks/realtime/hooks";
import { Point, Stroke } from "@/types/strokeTypes";
import {
    CanvasState,
    ToolCallbacks,
    ToolContext,
} from "@/types/canvasStateTypes";
import { toolStrategies } from "@/lib/handlers/toolStrategies";
import { panStrategy } from "@/lib/handlers/tools/pan";
import { abortPointerGesture } from "@/lib/handlers/tools/pointer";
import { toCanvasPoint, screenToWorld } from "@/lib/handlers/helpers";
import { clampZoom, zoomAt, ZOOM_RATIO } from "@/lib/viewport";

interface UseCanvasInputProps {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    canvasStateRef: RefObject<CanvasState>;
    strokes: readonly Stroke[] | null;
    callbacks: ToolCallbacks;
    enabled: boolean;
}

// Presence and the eraser are the only per-move costs worth gating: one is a
// socket write, the other filters every stroke and mutates storage. Pen,
// highlighter and pointer moves touch local state only, and starving those is
// what loses handwriting detail.
const PRESENCE_THROTTLE_MS = 16;
const ERASER_THROTTLE_MS = 16;

type ActivePointer = { clientX: number; clientY: number };

type Pinch = {
    ids: [number, number];
    startDistance: number;
    startZoom: number;
    startWorld: Point;
};

const distance = (a: ActivePointer, b: ActivePointer) =>
    Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

const midpoint = (a: ActivePointer, b: ActivePointer) => ({
    clientX: (a.clientX + b.clientX) / 2,
    clientY: (a.clientY + b.clientY) / 2,
});

export const useCanvasInput = ({
    canvasRef,
    canvasStateRef,
    strokes,
    callbacks,
    enabled,
}: UseCanvasInputProps) => {
    const updateMyPresence = useUpdateMyPresence();

    // Read inside listeners that are attached once, so the listener set doesn't
    // churn on every storage tick.
    const liveRef = useRef({ strokes, callbacks });
    useEffect(() => {
        liveRef.current = { strokes, callbacks };
    }, [strokes, callbacks]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !enabled) return;

        const state = canvasStateRef.current;

        const activePointers = new Map<number, ActivePointer>();
        let drawingPointerId: number | null = null;
        let drawingPointerType = "mouse";
        let panningPointerId: number | null = null;
        // Latched for the session: a Pencil user rests a palm on the glass, and
        // a mode that silently flipped back mid-lesson would mark the board.
        let penSeen = false;
        let pinch: Pinch | null = null;
        let lastPresence = 0;
        let lastErase = 0;

        const refreshRect = () => {
            const { left, top, width, height } = canvas.getBoundingClientRect();
            state.canvasRect = { left, top, width, height };
        };

        const observer = new ResizeObserver(refreshRect);
        observer.observe(canvas);
        refreshRect();

        const context = (e: PointerEvent): ToolContext => ({
            e,
            state,
            strokes: liveRef.current.strokes,
            callbacks: liveRef.current.callbacks,
        });

        const publishCursor = (e: PointerEvent, force = false) => {
            const now = performance.now();
            if (!force && now - lastPresence < PRESENCE_THROTTLE_MS) return;
            lastPresence = now;

            const { x, y } = screenToWorld(toCanvasPoint(e, state), state);
            state.cursorPosition = { x: Math.round(x), y: Math.round(y) };
            updateMyPresence({ cursor: state.cursorPosition });
        };

        const stopDrawing = () => {
            drawingPointerId = null;
            drawingPointerType = "mouse";
        };

        const discardGesture = () => {
            state.isDrawing = false;
            state.currentStroke = null;
            abortPointerGesture(state);
            stopDrawing();
        };

        const beginPinch = () => {
            const [a, b] = [...activePointers.entries()].slice(0, 2);
            if (!a || !b) return;

            const mid = midpoint(a[1], b[1]);
            pinch = {
                ids: [a[0], b[0]],
                startDistance: distance(a[1], b[1]),
                startZoom: state.viewport.zoom,
                startWorld: screenToWorld(toCanvasPoint(mid, state), state),
            };
        };

        const updatePinch = () => {
            if (!pinch) return;
            const a = activePointers.get(pinch.ids[0]);
            const b = activePointers.get(pinch.ids[1]);
            if (!a || !b) return;

            const spread = distance(a, b);
            if (pinch.startDistance === 0) return;

            const vp = state.viewport;
            vp.zoom = clampZoom(
                pinch.startZoom * (spread / pinch.startDistance),
            );
            const mid = toCanvasPoint(midpoint(a, b), state);
            vp.offset = {
                x: mid.x - pinch.startWorld.x * vp.zoom,
                y: mid.y - pinch.startWorld.y * vp.zoom,
            };
        };

        const mayDraw = (e: PointerEvent): boolean => {
            if (e.pointerType === "pen") return true;
            if (e.pointerType === "mouse") return e.button === 0;
            return !penSeen && activePointers.size === 1;
        };

        const onPointerDown = (e: PointerEvent) => {
            e.preventDefault();
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }

            refreshRect();
            activePointers.set(e.pointerId, {
                clientX: e.clientX,
                clientY: e.clientY,
            });

            if (e.pointerType === "pen") {
                if (
                    drawingPointerId !== null &&
                    drawingPointerType === "touch"
                ) {
                    discardGesture();
                }
                penSeen = true;
            }

            if (pinch) return;

            if (drawingPointerId !== null && drawingPointerId !== e.pointerId) {
                if (drawingPointerType === "pen") return;
                discardGesture();
                beginPinch();
                return;
            }

            if (e.pointerType === "mouse" && e.button === 2) {
                panningPointerId = e.pointerId;
                canvas.setPointerCapture(e.pointerId);
                panStrategy.onDown?.(context(e));
                return;
            }

            if (mayDraw(e)) {
                drawingPointerId = e.pointerId;
                drawingPointerType = e.pointerType;
                canvas.setPointerCapture(e.pointerId);
                publishCursor(e, true);
                toolStrategies[state.tool].onDown?.(context(e));
                return;
            }

            if (activePointers.size >= 2) beginPinch();
        };

        const onPointerMove = (e: PointerEvent) => {
            const tracked = activePointers.get(e.pointerId);
            if (tracked) {
                tracked.clientX = e.clientX;
                tracked.clientY = e.clientY;
            }

            if (pinch) {
                updatePinch();
                return;
            }

            if (e.pointerId === panningPointerId) {
                panStrategy.onMove?.(context(e));
                return;
            }

            if (e.pointerId === drawingPointerId) {
                if (state.tool === "eraser") {
                    const now = performance.now();
                    if (now - lastErase < ERASER_THROTTLE_MS) return;
                    lastErase = now;
                    toolStrategies.eraser.onMove?.(context(e));
                } else {
                    const samples =
                        typeof e.getCoalescedEvents === "function"
                            ? e.getCoalescedEvents()
                            : [];
                    const move = toolStrategies[state.tool].onMove;
                    if (samples.length > 0) {
                        for (const sample of samples) move?.(context(sample));
                    } else {
                        move?.(context(e));
                    }
                }
                publishCursor(e);
                return;
            }

            if (activePointers.size === 0) publishCursor(e);
        };

        const releasePointer = (e: PointerEvent) => {
            activePointers.delete(e.pointerId);

            if (e.pointerType !== "mouse" && activePointers.size === 0) {
                updateMyPresence({ cursor: null });
            }

            if (pinch && pinch.ids.includes(e.pointerId)) {
                pinch = null;
                if (activePointers.size >= 2) beginPinch();
            }

            if (e.pointerId === panningPointerId) {
                panStrategy.onUp?.(context(e));
                panningPointerId = null;
                return;
            }

            if (e.pointerId !== drawingPointerId) return;

            toolStrategies[state.tool].onUp?.(context(e));
            state.imageDragOffset = null;
            state.activeResizeHandle = null;
            state.imageTransformOrigin = null;
            stopDrawing();
        };

        const onPointerUp = (e: PointerEvent) => releasePointer(e);

        const onPointerLeave = (e: PointerEvent) => {
            if (e.pointerType !== "mouse") return;
            const { left, top, width, height } = state.canvasRect;
            const inside =
                e.clientX >= left &&
                e.clientX <= left + width &&
                e.clientY >= top &&
                e.clientY <= top + height;
            if (!inside) updateMyPresence({ cursor: null });
        };

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const anchor = toCanvasPoint(e, state);
            const factor = e.ctrlKey
                ? Math.exp(-e.deltaY / 100)
                : e.deltaY < 0
                  ? ZOOM_RATIO
                  : 1 / ZOOM_RATIO;
            zoomAt(state.viewport, state.viewport.zoom * factor, anchor);
        };

        const preventContextMenu = (e: MouseEvent) => e.preventDefault();

        const preventTouchDefault = (e: TouchEvent) => e.preventDefault();
        const preventGesture = (e: Event) => e.preventDefault();

        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", onPointerUp);
        canvas.addEventListener("pointercancel", onPointerUp);
        canvas.addEventListener("pointerleave", onPointerLeave);
        canvas.addEventListener("wheel", onWheel, { passive: false });
        canvas.addEventListener("contextmenu", preventContextMenu);
        canvas.addEventListener("touchstart", preventTouchDefault, {
            passive: false,
        });
        canvas.addEventListener("touchmove", preventTouchDefault, {
            passive: false,
        });
        canvas.addEventListener("gesturestart", preventGesture);
        canvas.addEventListener("gesturechange", preventGesture);

        return () => {
            observer.disconnect();
            canvas.removeEventListener("pointerdown", onPointerDown);
            canvas.removeEventListener("pointermove", onPointerMove);
            canvas.removeEventListener("pointerup", onPointerUp);
            canvas.removeEventListener("pointercancel", onPointerUp);
            canvas.removeEventListener("pointerleave", onPointerLeave);
            canvas.removeEventListener("wheel", onWheel);
            canvas.removeEventListener("contextmenu", preventContextMenu);
            canvas.removeEventListener("touchstart", preventTouchDefault);
            canvas.removeEventListener("touchmove", preventTouchDefault);
            canvas.removeEventListener("gesturestart", preventGesture);
            canvas.removeEventListener("gesturechange", preventGesture);
        };
    }, [canvasRef, canvasStateRef, enabled, updateMyPresence]);
};
