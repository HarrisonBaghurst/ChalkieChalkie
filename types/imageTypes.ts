export type PastedImage = {
    id: string;
    element: HTMLImageElement;
    x: number;
    y: number;
    width: number;
    height: number;
};

export type ResizeHandleKey = "nw" | "ne" | "sw" | "se";
export type ResizeHandle = ResizeHandleKey | null;
