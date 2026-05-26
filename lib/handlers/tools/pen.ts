import { Point, Stroke } from "@/types/strokeTypes";
import { RefObject } from "react";
import { getWorldPoint } from "../helpers";
import { simplifyRDP } from "@/lib/strokeOptimisation";

interface HandlePenDownProps {
    e: React.MouseEvent;
    isDrawingRef: RefObject<boolean>;
    currentStrokeRef: RefObject<Stroke | null>;
    lastPanOffsetRef: RefObject<Point>;
    zoomRef: RefObject<number>;
    currentColourRef: RefObject<string>;
}

export const handlePenDown = ({
    e,
    isDrawingRef,
    currentStrokeRef,
    lastPanOffsetRef,
    zoomRef,
    currentColourRef,
}: HandlePenDownProps) => {
    isDrawingRef.current = true;
    const worldPoint = getWorldPoint({ e, lastPanOffsetRef, zoomRef });
    currentStrokeRef.current = {
        id: crypto.randomUUID(),
        points: [worldPoint],
        colour: currentColourRef.current,
    };
};

interface HandlePenMoveProps {
    e: React.MouseEvent;
    currentStrokeRef: RefObject<Stroke | null>;
    lastPanOffsetRef: RefObject<Point>;
    zoomRef: RefObject<number>;
}

export const handlePenMove = ({
    e,
    currentStrokeRef,
    lastPanOffsetRef,
    zoomRef,
}: HandlePenMoveProps) => {
    if (!currentStrokeRef.current) return;
    const worldPoint = getWorldPoint({ e, lastPanOffsetRef, zoomRef });

    if (e.shiftKey && currentStrokeRef.current.points.length > 0) {
        const origin = currentStrokeRef.current.points[0];
        currentStrokeRef.current.points = [origin, worldPoint];
    } else {
        currentStrokeRef.current.points.push(worldPoint);
    }
};

interface HandlePenUpProps {
    e: React.MouseEvent;
    isDrawingRef: RefObject<boolean>;
    currentStrokeRef: RefObject<Stroke | null>;
    onStrokeFinished: (stroke: Stroke) => void;
}

export const handlePenUp = ({
    e,
    isDrawingRef,
    currentStrokeRef,
    onStrokeFinished,
}: HandlePenUpProps) => {
    isDrawingRef.current = false;
    if (currentStrokeRef.current) {
        const simplified = e.shiftKey
            ? currentStrokeRef.current.points
            : simplifyRDP(currentStrokeRef.current.points, 1);
        const newStroke = {
            id: crypto.randomUUID(),
            points: simplified,
            colour: currentStrokeRef.current.colour,
        };
        onStrokeFinished(newStroke);
        currentStrokeRef.current = null;
    }
};
