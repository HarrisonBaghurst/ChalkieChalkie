import { StrokeIntersectPoints } from "@/lib/genometry";
import { Point, Stroke } from "@/types/strokeTypes";
import { getWorldPoint } from "../helpers";
import { RefObject } from "react";

const ERASER_RADIUS = 10;

interface HandleEraserMoveProps {
    e: React.MouseEvent;
    strokes: readonly Stroke[] | null;
    lastPanOffsetRef: RefObject<Point>;
    onErase: (StrokeIds: string[]) => void;
}

export const handleEraserMove = ({
    e,
    strokes,
    lastPanOffsetRef,
    onErase,
}: HandleEraserMoveProps) => {
    if (!strokes) return;

    const worldPoint = getWorldPoint({ e, lastPanOffsetRef });

    const hitStrokeIds = strokes
        .filter((strokes) =>
            StrokeIntersectPoints(strokes, worldPoint, ERASER_RADIUS),
        )
        .map((stroke) => stroke.id);

    if (hitStrokeIds.length >= 1) {
        onErase(hitStrokeIds);
    }
};
