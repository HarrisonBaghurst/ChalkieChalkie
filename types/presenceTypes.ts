import { Rect } from "@/lib/genometry";

export type SelectionPresence = {
    strokeIds: string[];
    imageIds: string[];
    bounds: Rect;
};

export interface RemoteSelection {
    connectionId: number;
    colour: string;
    bounds: Rect;
}
