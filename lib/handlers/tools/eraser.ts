import { StrokeIntersectPoints } from "@/lib/genometry";
import { ToolContext, ToolStrategy } from "@/types/canvasStateTypes";
import { toWorldPoint } from "../helpers";

const ERASER_RADIUS = 10;

const onMove = ({ e, state, strokes, callbacks }: ToolContext) => {
    if (!strokes) return;

    const worldPoint = toWorldPoint(e, state);

    const hitStrokeIds = strokes
        .filter((stroke) =>
            StrokeIntersectPoints(stroke, worldPoint, ERASER_RADIUS),
        )
        .map((stroke) => stroke.id);

    if (hitStrokeIds.length >= 1) {
        callbacks.onErase(hitStrokeIds);
    }
};

export const eraserStrategy: ToolStrategy = { onMove };
