import { CanvasState } from "@/types/canvasStateTypes";
import { deleteSelection } from "@/lib/deleteSelection";
import { RefObject, useEffect } from "react";

interface UseKeybindsProps {
    canvasStateRef: RefObject<CanvasState>;
    removeImageMeta: (id: string) => void;
    undo: () => void;
    redo: () => void;
    eraseStrokes: (ids: string[]) => void;
}

export const useKeybinds = ({
    canvasStateRef,
    removeImageMeta,
    undo,
    redo,
    eraseStrokes,
}: UseKeybindsProps) => {
    useEffect(() => {
        const onKeypress = (event: KeyboardEvent) => {
            // So Backspace/Ctrl+Z in a text field don't leak into the canvas.
            const target = event.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.isContentEditable)
            ) {
                return;
            }

            const state = canvasStateRef.current;
            const accel = event.ctrlKey || event.metaKey;

            if (accel && event.key.toLowerCase() === "z") {
                event.preventDefault();
                if (event.shiftKey) redo();
                else undo();
            } else if (accel && event.key === "y") {
                event.preventDefault();
                redo();
            } else if (event.key === "Delete" || event.key === "Backspace") {
                deleteSelection({ state, eraseStrokes, removeImageMeta });
            }
        };

        document.addEventListener("keydown", onKeypress);
        return () => document.removeEventListener("keydown", onKeypress);
    }, []);
};
