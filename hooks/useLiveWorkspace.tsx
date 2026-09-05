import { useCallback } from "react";
import { PastedImageMeta } from "@/types/imageTypes";
import { Point, Stroke } from "@/types/strokeTypes";
import { useHistory } from "@/hooks/realtime/hooks";
import { useRoom, useRoomSnapshot } from "@/hooks/realtime/RoomProvider";

export const useLiveWorkspace = () => {
    const room = useRoom();
    const { strokes, images } = useRoomSnapshot();
    const { undo, redo } = useHistory();

    const addStroke = useCallback(
        (stroke: Stroke) => room.commit({ t: "addStroke", stroke }),
        [room],
    );

    const eraseStrokes = useCallback(
        (strokeIds: string[]) =>
            room.commit({ t: "eraseStrokes", ids: strokeIds }),
        [room],
    );

    const addImageMeta = useCallback(
        (meta: PastedImageMeta) => room.commit({ t: "addImage", meta }),
        [room],
    );

    const removeImageMeta = useCallback(
        (id: string) => room.commit({ t: "removeImage", id }),
        [room],
    );

    const updateImageMeta = useCallback(
        (id: string, changes: Partial<PastedImageMeta>) =>
            room.commit({ t: "updateImage", id, changes }),
        [room],
    );

    const moveStrokes = useCallback(
        (moves: { id: string; points: Point[] }[]) =>
            room.commit({ t: "moveStrokes", moves }),
        [room],
    );

    return {
        strokes,
        pastedImagesMeta: images,
        undo,
        redo,
        addStroke,
        eraseStrokes,
        addImageMeta,
        removeImageMeta,
        updateImageMeta,
        moveStrokes,
    };
};
