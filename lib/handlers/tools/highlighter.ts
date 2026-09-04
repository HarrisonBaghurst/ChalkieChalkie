import { ToolContext, ToolStrategy } from "@/types/canvasStateTypes";
import { toWorldPoint } from "../helpers";
import { simplifyRDP, SIMPLIFY_EPSILON } from "@/lib/strokeOptimisation";
import { newId } from "@/lib/id";

const onDown = ({ e, state }: ToolContext) => {
    state.isDrawing = true;
    state.currentStroke = {
        id: newId(),
        points: [toWorldPoint(e, state)],
        colour: state.highlightColour,
        highlight: true,
    };
};

const onMove = ({ e, state }: ToolContext) => {
    if (!state.isDrawing || !state.currentStroke) return;
    const worldPoint = toWorldPoint(e, state);

    if (e.shiftKey && state.currentStroke.points.length > 0) {
        const origin = state.currentStroke.points[0];
        state.currentStroke.points = [origin, worldPoint];
    } else {
        state.currentStroke.points.push(worldPoint);
    }
};

const onUp = ({ e, state, callbacks }: ToolContext) => {
    if (!state.isDrawing) return;
    state.isDrawing = false;
    if (state.currentStroke) {
        const simplified = e.shiftKey
            ? state.currentStroke.points
            : simplifyRDP(
                  state.currentStroke.points,
                  SIMPLIFY_EPSILON / state.viewport.zoom,
              );
        callbacks.onStrokeFinished({
            ...state.currentStroke,
            points: simplified,
        });
        state.currentStroke = null;
    }
};

export const highlighterStrategy: ToolStrategy = { onDown, onMove, onUp };
