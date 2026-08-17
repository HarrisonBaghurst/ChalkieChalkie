import { LiveList } from "@liveblocks/client";
import { Stroke } from "./types/strokeTypes";
import { PastedImageMeta } from "./types/imageTypes";

// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
declare global {
    interface Liveblocks {
        Presence: {
            cursor: { x: number; y: number } | null;
        };

        Storage: {
            canvasStrokes: LiveList<Stroke>;
            pastedImages: LiveList<PastedImageMeta>;
        };

        // Set server-side in liveblocks-auth.
        UserMeta: {
            id: string;
            info: {
                firstName: string;
                lastName: string;
                imageUrl: string;
                email: string;
            };
        };

        RoomEvent: {};
        ThreadMetadata: {};
        RoomInfo: {};
    }
}
