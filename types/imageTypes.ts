export type PastedImageMeta = {
    id: string;
    url: string;
    x: number;
    y: number;
    width: number;
    height: number;
};

export type PastedImage = PastedImageMeta & {
    element: HTMLImageElement;
};

export type ResizeHandleKey = "nw" | "ne" | "sw" | "se";
export type ResizeHandle = ResizeHandleKey | null;
