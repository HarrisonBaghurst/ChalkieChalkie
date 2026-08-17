import { useOthers } from "@liveblocks/react";
import { RefObject, useEffect, useRef } from "react";
import Image from "next/image";
import { CanvasState } from "@/types/canvasStateTypes";
import { getUserColour } from "@/lib/userColour";
import { cn } from "@/lib/utils";

const SELECTION_LABEL_GAP = 6;

interface CursorLayerProps {
    canvasStateRef: RefObject<CanvasState>;
}

const UserPill = ({
    colour,
    name,
    imageUrl,
    className,
}: {
    colour: string;
    name: string;
    imageUrl?: string;
    className?: string;
}) => (
    <div
        className={cn(
            "flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full whitespace-nowrap",
            className,
        )}
        style={{ backgroundColor: colour }}
    >
        {imageUrl ? (
            <div className="relative w-5 h-5 rounded-full overflow-hidden shrink-0">
                <Image src={imageUrl} alt={name} fill sizes="20px" />
            </div>
        ) : null}
        <span className="text-caption font-medium text-white">
            {name || "Anonymous"}
        </span>
    </div>
);

const CursorLayer = ({ canvasStateRef }: CursorLayerProps) => {
    const others = useOthers();

    // A ref, so a presence tick doesn't restart the rAF loop.
    const othersRef = useRef(others);
    othersRef.current = others;
    const cursorRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const labelRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    // Transforms come off the viewport ref each frame, so remote cursors keep
    // tracking while this user pans.
    useEffect(() => {
        let cancelled = false;
        const update = () => {
            if (cancelled) return;
            const { offset, zoom } = canvasStateRef.current.viewport;
            othersRef.current.forEach(({ connectionId, presence }) => {
                const cursorEl = cursorRefs.current.get(connectionId);
                if (cursorEl && presence?.cursor) {
                    const screenX = presence.cursor.x * zoom + offset.x;
                    const screenY = presence.cursor.y * zoom + offset.y;
                    cursorEl.style.transform = `translate(${screenX}px, ${screenY}px)`;
                }

                const labelEl = labelRefs.current.get(connectionId);
                if (labelEl && presence?.selection) {
                    const { x, y } = presence.selection.bounds;
                    const screenX = x * zoom + offset.x;
                    const screenY = y * zoom + offset.y - SELECTION_LABEL_GAP;
                    labelEl.style.transform = `translate(${screenX}px, ${screenY}px) translateY(-100%)`;
                }
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
                const colour = getUserColour(id);
                const name = `${info?.firstName ?? ""} ${
                    info?.lastName ?? ""
                }`.trim();

                if (presence?.selection) {
                    const { x, y } = presence.selection.bounds;
                    const screenX = x * zoom + offset.x;
                    const screenY = y * zoom + offset.y - SELECTION_LABEL_GAP;
                    return (
                        <div
                            key={connectionId}
                            ref={(el) => {
                                if (el) labelRefs.current.set(connectionId, el);
                                else labelRefs.current.delete(connectionId);
                            }}
                            style={{
                                position: "absolute",
                                left: 0,
                                top: 0,
                                transform: `translate(${screenX}px, ${screenY}px) translateY(-100%)`,
                                pointerEvents: "none",
                                willChange: "transform",
                            }}
                        >
                            <UserPill
                                colour={colour}
                                name={name}
                                imageUrl={info?.imageUrl}
                            />
                        </div>
                    );
                }

                if (!presence?.cursor) return null;
                const screenX = presence.cursor.x * zoom + offset.x;
                const screenY = presence.cursor.y * zoom + offset.y;
                return (
                    <div
                        key={connectionId}
                        ref={(el) => {
                            if (el) cursorRefs.current.set(connectionId, el);
                            else cursorRefs.current.delete(connectionId);
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
                        <UserPill
                            colour={colour}
                            name={name}
                            imageUrl={info?.imageUrl}
                            className="absolute left-4 top-4"
                        />
                    </div>
                );
            })}
        </>
    );
};

export default CursorLayer;
