import { Stroke } from "@/types/strokeTypes";
import { ToolContext, ToolStrategy } from "@/types/canvasStateTypes";
import { getWorldPoint } from "../helpers";
import { simplifyRDP } from "@/lib/strokeOptimisation";

const onDown = ({ e, state }: ToolContext) => {
    state.isDrawing = true;
    const worldPoint = getWorldPoint(e, state.viewport);
    state.currentStroke = {
        id: crypto.randomUUID(),
        points: [worldPoint],
        colour: state.highlightColour,
        highlight: true,
    };
};

const onMove = ({ e, state }: ToolContext) => {
    if (!state.isDrawing || !state.currentStroke) return;
    const worldPoint = getWorldPoint(e, state.viewport);

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
            : simplifyRDP(state.currentStroke.points, 1);
        const newStroke: Stroke = {
            id: crypto.randomUUID(),
            points: simplified,
            colour: state.currentStroke.colour,
            highlight: true,
        };
        callbacks.onStrokeFinished(newStroke);
        state.currentStroke = null;
    }
};

export const highlighterStrategy: ToolStrategy = { onDown, onMove, onUp };
