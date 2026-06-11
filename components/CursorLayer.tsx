import { useOthers } from "@liveblocks/react";
import { RefObject, useEffect, useRef } from "react";
import { CanvasState } from "@/types/canvasStateTypes";

// TBD - will update to be different colour per user later
const COLOR = "#eb7a38";

interface CursorLayerProps {
    canvasStateRef: RefObject<CanvasState>;
}

const CursorLayer = ({ canvasStateRef }: CursorLayerProps) => {
    const others = useOthers();

    // keep latest others without restarting the rAF loop on every presence tick
    const othersRef = useRef(others);
    othersRef.current = others;
    const svgRefs = useRef<Map<number, SVGSVGElement | null>>(new Map());

    // drive cursor transforms off the viewport ref each frame so remote cursors
    // track smoothly while THIS user pans/zooms (single source of truth, no
    // stale state mirror that freezes mid-pan)
    useEffect(() => {
        let cancelled = false;
        const update = () => {
            if (cancelled) return;
            const { offset, zoom } = canvasStateRef.current.viewport;
            othersRef.current.forEach(({ connectionId, presence }) => {
                const el = svgRefs.current.get(connectionId);
                if (!el || !presence?.cursor) return;
                const screenX = presence.cursor.x * zoom + offset.x;
                const screenY = presence.cursor.y * zoom + offset.y;
                el.style.transform = `translate(${screenX}px, ${screenY}px)`;
            });
            requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
        return () => {
            cancelled = true;
        };
    }, [canvasStateRef]);

    const { offset, zoom } = canvasStateRef.current.viewport;

    return (
        <>
            {others.map(({ connectionId, presence }) => {
                if (!presence?.cursor) return null;
                // initial transform from current viewport; rAF keeps it fresh
                const screenX = presence.cursor.x * zoom + offset.x;
                const screenY = presence.cursor.y * zoom + offset.y;
                return (
                    <svg
                        key={connectionId}
                        ref={(el) => {
                            svgRefs.current.set(connectionId, el);
                        }}
                        style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            transform: `translate(${screenX}px, ${screenY}px)`,
                            transition: "transform 300ms ease-out",
                            pointerEvents: "none",
                            willChange: "transform",
                        }}
                        width="24"
                        height="36"
                        viewBox="0 0 24 36"
                        fill="none"
                    >
                        <path
                            fill={COLOR}
                            d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                        />
                    </svg>
                );
            })}
        </>
    );
};

export default CursorLayer;
