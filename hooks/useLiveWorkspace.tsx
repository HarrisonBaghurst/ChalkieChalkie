import { PastedImageMeta } from "@/types/imageTypes";
import { Stroke } from "@/types/strokeTypes";
import { useHistory, useMutation, useStorage } from "@liveblocks/react";

export const useLiveWorkspace = () => {
    const strokes = useStorage((root) => root.canvasStrokes);
    const pastedImagesMeta = useStorage((root) => root.pastedImages);
    const { undo, redo } = useHistory();

    const addStroke = useMutation(({ storage }, stroke: Stroke) => {
        storage.get("canvasStrokes").push(stroke);
    }, []);

    const eraseStrokes = useMutation(({ storage }, strokeIds: string[]) => {
        const strokes = storage.get("canvasStrokes");
        for (let i = strokes.length - 1; i >= 0; i--) {
            if (strokeIds.includes(strokes.get(i)!.id)) {
                strokes.delete(i);
            }
        }
    }, []);

    const addImageMeta = useMutation(({ storage }, meta: PastedImageMeta) => {
        storage.get("pastedImages").push(meta);
    }, []);

    const removeImageMeta = useMutation(({ storage }, id: string) => {
        const images = storage.get("pastedImages");
        for (let i = images.length - 1; i >= 0; i--) {
            if (images.get(i)!.id === id) {
                images.delete(i);
            }
        }
    }, []);

    const updateImageMeta = useMutation(
        ({ storage }, id: string, changes: Partial<PastedImageMeta>) => {
            const images = storage.get("pastedImages");
            for (let i = 0; i < images.length; i++) {
                const img = images.get(i)!;
                if ((img.id = id)) {
                    images.set(i, { ...img, ...changes });
                    break;
                }
            }
        },
        [],
    );

    return {
        strokes,
        pastedImagesMeta,
        undo,
        redo,
        addStroke,
        eraseStrokes,
        addImageMeta,
        removeImageMeta,
        updateImageMeta,
    };
};
