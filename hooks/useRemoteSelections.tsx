import { useOthers } from "@/hooks/realtime/hooks";
import { RefObject, useEffect, useRef } from "react";
import { CanvasState } from "@/types/canvasStateTypes";
import { RemoteSelection } from "@/types/presenceTypes";
import { getUserColour } from "@/lib/userColour";

export const useRemoteSelections = (
    canvasStateRef: RefObject<CanvasState>,
): RefObject<RemoteSelection[]> => {
    const others = useOthers();
    const remoteSelectionsRef = useRef<RemoteSelection[]>([]);

    useEffect(() => {
        const selections: RemoteSelection[] = [];
        const lockedStrokeIds = new Set<string>();
        const lockedImageIds = new Set<string>();

        for (const { connectionId, id, presence } of others) {
            const selection = presence?.selection;
            if (!selection) continue;

            for (const strokeId of selection.strokeIds)
                lockedStrokeIds.add(strokeId);
            for (const imageId of selection.imageIds)
                lockedImageIds.add(imageId);

            selections.push({
                connectionId,
                colour: getUserColour(id),
                bounds: selection.bounds,
            });
        }

        remoteSelectionsRef.current = selections;
        canvasStateRef.current.lockedStrokeIds = lockedStrokeIds;
        canvasStateRef.current.lockedImageIds = lockedImageIds;
    }, [others, canvasStateRef]);

    return remoteSelectionsRef;
};
