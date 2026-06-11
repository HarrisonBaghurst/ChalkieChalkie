import { Point, Stroke } from "@/types/strokeTypes";
import { PastedImage, PastedImageMeta, ResizeHandle } from "@/types/imageTypes";
import { Rect } from "@/lib/genometry";
import { Tools } from "@/types/toolTypes";

// camera — single source of truth for pan/zoom
export interface Viewport {
    offset: Point;
    zoom: number;
}

// all mutable canvas interaction state lives in one object held in a single ref
export interface CanvasState {
    // camera
    viewport: Viewport;
    // transient pan session — set on pan-down, cleared on pan-up
    panOrigin: { startScreen: Point; startOffset: Point } | null;
    lastMouseScreen: Point | null;

    // drawing
    currentStroke: Stroke | null;
    isDrawing: boolean;
    currentColour: string;
    highlightColour: string;
    tool: Tools;

    // images
    cursorPosition: Point;
    selectedImageId: string | null;
    imageDragOffset: Point | null;
    activeResizeHandle: ResizeHandle;
    pastedImages: PastedImage[];

    // selector
    selectorRect: Rect | null;
    selectorRectOrigin: Rect | null;
    selectorStart: Point | null;
    selectedStrokeIds: string[];
    selectedImageIds: string[];
    selectorDragStart: Point | null;
    selectorDelta: Point;
    selectorImageOrigins: Map<string, Point>;
}

// Liveblocks mutations handed to tools so they can commit on mouse-up
export interface ToolCallbacks {
    onErase: (ids: string[]) => void;
    onStrokeFinished: (stroke: Stroke) => void;
    onImageMoved: (id: string, changes: Partial<PastedImageMeta>) => void;
    onMoveStrokes: (moves: { id: string; points: Point[] }[]) => void;
}

// everything a tool strategy needs, passed to every onDown/onMove/onUp
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
