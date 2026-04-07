import { useOthers } from "@liveblocks/react";

// TBD - will update to be different colour per user later
const COLOR = "#eb7a38";

const CursorLayer = () => {
    const others = useOthers();

    return (
        <>
            {others.map(({ connectionId, presence }) => {
                if (!presence?.cursor) return null;
                return (
                    <svg
                        style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            transform: `translate(${presence.cursor.x}px, ${presence.cursor.y}px)`,
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
