import { Point, Stroke } from '@/types/strokeTypes';
import { simplifyRDP } from './strokeOptimisation';
import { RefObject } from 'react';

// --- type definitions ---

type handleMouseDownParameters = {
    e: React.MouseEvent;
    currentColourRef: RefObject<string>;
    currentStrokeRef: RefObject<Stroke | null>;
    isDrawingRef: RefObject<boolean>;
    panStartRef: RefObject<Point | null>;
    lastPanOffsetRef: RefObject<Point>;
};

type handleMouseMoveParameters = {
    e: React.MouseEvent;
    currentStrokeRef: RefObject<Stroke | null>;
    isDrawingRef: RefObject<boolean>;
    panStartRef: RefObject<Point | null>;
    panOffsetRef: RefObject<Point>;
    lastPanOffsetRef: RefObject<Point>;
};

type handleMouseUpParameters = {
    e: React.MouseEvent;
    isDrawingRef: RefObject<boolean>;
    currentStrokeRef: RefObject<Stroke | null>;
    strokesRef: RefObject<Stroke[]>;
    panStartRef: RefObject<Point | null>;
    lastPanOffsetRef: RefObject<Point>;
    panOffsetRef: RefObject<Point>;
};

type handleUndoProps = {
    strokesRef: RefObject<Stroke[]>;
}

// --- helper ---

const getMousePos = (e: React.MouseEvent): Point => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};

// --- input handlers ---

export const handleMouseDown = ({
    e,
    currentColourRef,
    currentStrokeRef,
    isDrawingRef,
    panStartRef,
    lastPanOffsetRef,
}: handleMouseDownParameters) => {
    e.preventDefault();

    if (e.buttons === 1) {
        // left click: start drawing
        isDrawingRef.current = true;
        const { x, y } = getMousePos(e);
        currentStrokeRef.current = {
            points: [{ x: x - lastPanOffsetRef.current.x, y: y - lastPanOffsetRef.current.y }],
            colour: currentColourRef.current,
        };
    }

    if (e.buttons === 2) {
        // right click: start panning
        panStartRef.current = getMousePos(e);
    }
};

export const handleMouseMove = (() => {
    let lastTime = 0;
    const THROTTLE_MS = 16; // 60 FPS
    return ({
        e,
        currentStrokeRef,
        isDrawingRef,
        panStartRef,
        panOffsetRef,
        lastPanOffsetRef,
    }: handleMouseMoveParameters) => {
        const now = performance.now();
        if (now - lastTime < THROTTLE_MS) return;
        lastTime = now;

        if (e.buttons === 1 && isDrawingRef.current && currentStrokeRef.current) {
            const { x, y } = getMousePos(e);
            currentStrokeRef.current.points.push({
                x: x - lastPanOffsetRef.current.x,
                y: y - lastPanOffsetRef.current.y,
            });
        }

        if (e.buttons === 2 && panStartRef.current) {
            const { x, y } = getMousePos(e);
            panOffsetRef.current = {
                x: lastPanOffsetRef.current.x + (x - panStartRef.current.x),
                y: lastPanOffsetRef.current.y + (y - panStartRef.current.y),
            };
        }
    };
})();

export const handleMouseUp = ({
    e,
    isDrawingRef,
    currentStrokeRef,
    strokesRef,
    panStartRef,
    lastPanOffsetRef,
    panOffsetRef,
}: handleMouseUpParameters) => {
    if (e.button === 0 && isDrawingRef.current) {
        isDrawingRef.current = false;
        if (currentStrokeRef.current) {
            const simplified = simplifyRDP(currentStrokeRef.current.points, 2.5);
            strokesRef.current.push({
                points: simplified,
                colour: currentStrokeRef.current.colour,
            });
            currentStrokeRef.current = null;
        }
    }

    if (e.button === 2) {
        panStartRef.current = null;
        lastPanOffsetRef.current = { ...panOffsetRef.current };
    }
};

export const handleUndo = ({
    strokesRef,
}: handleUndoProps) => {
    if (strokesRef.current) {
        strokesRef.current.pop();
    }
};
