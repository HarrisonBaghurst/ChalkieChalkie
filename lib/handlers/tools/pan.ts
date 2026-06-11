import { ToolContext, ToolStrategy } from "@/types/canvasStateTypes";
import { getMousePos } from "../helpers";

const onDown = ({ e, state }: ToolContext) => {
    state.panOrigin = {
        startScreen: getMousePos(e),
        startOffset: { ...state.viewport.offset },
    };
};

const onMove = ({ e, state }: ToolContext) => {
    if (!state.panOrigin) return;
    const { x, y } = getMousePos(e);
    state.viewport.offset = {
        x: state.panOrigin.startOffset.x + (x - state.panOrigin.startScreen.x),
        y: state.panOrigin.startOffset.y + (y - state.panOrigin.startScreen.y),
    };
};

const onUp = ({ state }: ToolContext) => {
    state.panOrigin = null;
};

export const panStrategy: ToolStrategy = { onDown, onMove, onUp };
