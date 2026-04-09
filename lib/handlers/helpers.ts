import { Point } from "@/types/strokeTypes";
import { RefObject } from "react";

export const getMousePos = (e: React.MouseEvent): Point => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};

interface GetWorldPointProps {
    e: React.MouseEvent;
    lastPanOffsetRef: RefObject<Point>;
}

export const getWorldPoint = ({
    e,
    lastPanOffsetRef,
}: GetWorldPointProps): Point => {
    const { x, y } = getMousePos(e);
    return {
        x: x - lastPanOffsetRef.current.x,
        y: y - lastPanOffsetRef.current.y,
    };
};
