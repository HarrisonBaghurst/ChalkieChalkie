import { RefObject } from "react";
import { getMousePos } from "../helpers";
import { Point } from "@/types/strokeTypes";

interface HandlePanDownProps {
    e: React.MouseEvent;
    panStartRef: RefObject<Point | null>;
}

export const handlePanDown = ({ e, panStartRef }: HandlePanDownProps) => {
    panStartRef.current = getMousePos(e);
};

interface HandlePanMoveProps {
    e: React.MouseEvent;
    panOffsetRef: RefObject<Point>;
    lastPanOffsetRef: RefObject<Point>;
    panStartRef: RefObject<Point | null>;
}

export const handlePanMove = ({
    e,
    panOffsetRef,
    lastPanOffsetRef,
    panStartRef,
}: HandlePanMoveProps) => {
    if (!panStartRef.current) return;
    const { x, y } = getMousePos(e);
    panOffsetRef.current = {
        x: lastPanOffsetRef.current.x + (x - panStartRef.current.x),
        y: lastPanOffsetRef.current.y + (y - panStartRef.current.y),
    };
};

interface HandlePanUpProps {
    panStartRef: RefObject<Point | null>;
    lastPanOffsetRef: RefObject<Point>;
    panOffsetRef: RefObject<Point>;
}

export const handlePanUp = ({
    panStartRef,
    lastPanOffsetRef,
    panOffsetRef,
}: HandlePanUpProps) => {
    panStartRef.current = null;
    lastPanOffsetRef.current = { ...panOffsetRef.current };
};
