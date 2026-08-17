import { Point, Stroke } from "@/types/strokeTypes";
import { PastedImage, PastedImageMeta, ResizeHandle } from "@/types/imageTypes";
import { Rect } from "@/lib/genometry";
import { Tools } from "@/types/toolTypes";

export interface Viewport {
    offset: Point;
    zoom: number;
}

// All mutable canvas interaction state, held in a single ref.
export interface CanvasState {
    // camera
    viewport: Viewport;
    // set on pan-down, cleared on pan-up
    panOrigin: { startScreen: Point; startOffset: Point } | null;
    lastMouseScreen: Point | null;

    // drawing
    currentStroke: Stroke | null;
    isDrawing: boolean;
    currentColour: string;
    highlightColour: string;
    tool: Tools;
    cursorPosition: Point;
    selectedImageId: string | null;
    imageDragOffset: Point | null;
    activeResizeHandle: ResizeHandle;
    pastedImages: PastedImage[];
    marqueeRect: Rect | null;
    selectionBounds: Rect | null;
    selectionBoundsOrigin: Rect | null;
    selectorStart: Point | null;
    selectedStrokeIds: string[];
    selectedImageIds: string[];
    selectorDragStart: Point | null;
    selectorDelta: Point;
    selectorImageOrigins: Map<string, Point>;
}

// Handed to tools so they can commit on mouse-up.
export interface ToolCallbacks {
    onErase: (ids: string[]) => void;
    onStrokeFinished: (stroke: Stroke) => void;
    onImageMoved: (id: string, changes: Partial<PastedImageMeta>) => void;
    onMoveStrokes: (moves: { id: string; points: Point[] }[]) => void;
}

export interface ToolContext {
    e: React.MouseEvent;
    state: CanvasState;
    strokes: readonly Stroke[] | null;
    callbacks: ToolCallbacks;
}

export interface ToolStrategy {
    onDown?: (ctx: ToolContext) => void;
    onMove?: (ctx: ToolContext) => void;
    onUp?: (ctx: ToolContext) => void;
}
