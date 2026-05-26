import { Point, Stroke } from "@/types/strokeTypes";
import { RefObject } from "react";
import { getWorldPoint } from "../helpers";
import { simplifyRDP } from "@/lib/strokeOptimisation";

interface HandleHighlighterDownProps {
    e: React.MouseEvent;
    isDrawingRef: RefObject<boolean>;
    currentStrokeRef: RefObject<Stroke | null>;
    lastPanOffsetRef: RefObject<Point>;
    zoomRef: RefObject<number>;
    highlightColourRef: RefObject<string>;
}

export const handleHighlighterDown = ({
    e,
    isDrawingRef,
    currentStrokeRef,
    lastPanOffsetRef,
    zoomRef,
    highlightColourRef,
}: HandleHighlighterDownProps) => {
    isDrawingRef.current = true;
    const worldPoint = getWorldPoint({ e, lastPanOffsetRef, zoomRef });
    currentStrokeRef.current = {
        id: crypto.randomUUID(),
        points: [worldPoint],
        colour: highlightColourRef.current,
        highlight: true,
    };
};

interface HandleHighlighterMoveProps {
    e: React.MouseEvent;
    currentStrokeRef: RefObject<Stroke | null>;
    lastPanOffsetRef: RefObject<Point>;
    zoomRef: RefObject<number>;
}

export const handleHighlighterMove = ({
    e,
    currentStrokeRef,
    lastPanOffsetRef,
    zoomRef,
}: HandleHighlighterMoveProps) => {
    if (!currentStrokeRef.current) return;
    const worldPoint = getWorldPoint({ e, lastPanOffsetRef, zoomRef });

    if (e.shiftKey && currentStrokeRef.current.points.length > 0) {
        const origin = currentStrokeRef.current.points[0];
        currentStrokeRef.current.points = [origin, worldPoint];
    } else {
        currentStrokeRef.current.points.push(worldPoint);
    }
};

interface HandleHighlighterUpProps {
    e: React.MouseEvent;
    isDrawingRef: RefObject<boolean>;
    currentStrokeRef: RefObject<Stroke | null>;
    onStrokeFinished: (stroke: Stroke) => void;
}

export const handleHighlighterUp = ({
    e,
    isDrawingRef,
    currentStrokeRef,
    onStrokeFinished,
}: HandleHighlighterUpProps) => {
    isDrawingRef.current = false;
    if (currentStrokeRef.current) {
        const simplified = e.shiftKey
            ? currentStrokeRef.current.points
            : simplifyRDP(currentStrokeRef.current.points, 1);
        const newStroke: Stroke = {
            id: crypto.randomUUID(),
            points: simplified,
            colour: currentStrokeRef.current.colour,
            highlight: true,
        };
        onStrokeFinished(newStroke);
        currentStrokeRef.current = null;
    }
};
