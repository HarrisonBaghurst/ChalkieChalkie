import { useOthers } from "@liveblocks/react";
import { RefObject, useEffect, useRef } from "react";
import Image from "next/image";
import { CanvasState } from "@/types/canvasStateTypes";
import { getUserColour } from "@/lib/userColour";

interface CursorLayerProps {
    canvasStateRef: RefObject<CanvasState>;
}

const CursorLayer = ({ canvasStateRef }: CursorLayerProps) => {
    const others = useOthers();

    // keep latest others without restarting the rAF loop on every presence tick
    const othersRef = useRef(others);
    othersRef.current = others;
    const cursorRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

    // drive cursor transforms off the viewport ref each frame so remote cursors
    // track smoothly while THIS user pans/zooms (single source of truth, no
    // stale state mirror that freezes mid-pan)
    useEffect(() => {
        let cancelled = false;
        const update = () => {
            if (cancelled) return;
            const { offset, zoom } = canvasStateRef.current.viewport;
            othersRef.current.forEach(({ connectionId, presence }) => {
                const el = cursorRefs.current.get(connectionId);
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
            {others.map(({ connectionId, id, presence, info }) => {
                if (!presence?.cursor) return null;
                // initial transform from current viewport; rAF keeps it fresh
                const screenX = presence.cursor.x * zoom + offset.x;
                const screenY = presence.cursor.y * zoom + offset.y;
                const colour = getUserColour(id);
                const name = `${info?.firstName ?? ""} ${
                    info?.lastName ?? ""
                }`.trim();
                return (
                    <div
                        key={connectionId}
                        ref={(el) => {
                            cursorRefs.current.set(connectionId, el);
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
                    >
                        <span
                            style={{
                                display: "block",
                                width: 24,
                                height: 24,
                                WebkitMask:
                                    "url(/icons/mouse-pointer-2.svg) center/contain no-repeat",
                                mask: "url(/icons/mouse-pointer-2.svg) center/contain no-repeat",
                                backgroundColor: colour,
                            }}
                        />
                        <div
                            className="absolute left-4 top-4 flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full whitespace-nowrap"
                            style={{ backgroundColor: colour }}
                        >
                            {info?.imageUrl ? (
                                <div className="relative w-5 h-5 rounded-full overflow-hidden shrink-0">
                                    <Image
                                        src={info.imageUrl}
                                        alt={name}
                                        fill
                                        sizes="20px"
                                    />
                                </div>
                            ) : null}
                            <span className="text-caption font-medium text-white">
                                {name || "Anonymous"}
                            </span>
                        </div>
                    </div>
                );
            })}
        </>
    );
};

export default CursorLayer;
