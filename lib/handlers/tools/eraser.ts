import { StrokeIntersectPoints } from "@/lib/genometry";
import { ToolContext, ToolStrategy } from "@/types/canvasStateTypes";
import { getWorldPoint } from "../helpers";

const ERASER_RADIUS = 10;

const onMove = ({ e, state, strokes, callbacks }: ToolContext) => {
    if (!strokes) return;

    const worldPoint = getWorldPoint(e, state.viewport);

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
