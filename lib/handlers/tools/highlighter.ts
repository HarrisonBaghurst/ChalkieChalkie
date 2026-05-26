import { Point, Stroke } from "@/types/strokeTypes";
import { RefObject } from "react";
import { getMousePos, getWorldPoint } from "../helpers";
import { simplifyRDP } from "@/lib/strokeOptimisation";

interface HandleHighlighterDownProps {
    e: React.MouseEvent;
    isDrawingRef: RefObject<boolean>;
    currentStrokeRef: RefObject<Stroke | null>;
    lastPanOffsetRef: RefObject<Point>;
    highlightColourRef: RefObject<string>;
}

export const handleHighlighterDown = ({
    e,
    isDrawingRef,
    currentStrokeRef,
    lastPanOffsetRef,
    highlightColourRef,
}: HandleHighlighterDownProps) => {
    isDrawingRef.current = true;
    const { x, y } = getMousePos(e);
    currentStrokeRef.current = {
        id: crypto.randomUUID(),
        points: [
            {
                x: x - lastPanOffsetRef.current.x,
                y: y - lastPanOffsetRef.current.y,
            },
        ],
        colour: highlightColourRef.current,
        highlight: true,
    };
};

interface HandleHighlighterMoveProps {
    e: React.MouseEvent;
    currentStrokeRef: RefObject<Stroke | null>;
    lastPanOffsetRef: RefObject<Point>;
}

export const handleHighlighterMove = ({
    e,
    currentStrokeRef,
    lastPanOffsetRef,
}: HandleHighlighterMoveProps) => {
    if (!currentStrokeRef.current) return;
    const worldPoint = getWorldPoint({ e, lastPanOffsetRef });

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
