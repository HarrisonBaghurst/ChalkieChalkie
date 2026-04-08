import { cn } from "@/lib/utils";
import { RefObject, useState } from "react";
import Image from "next/image";
import ColourSelector from "./ColourSelector";

interface SidebarButtonProps {
    icon: string;
    label: string;
    isActive?: boolean;
    onSelect?: () => void;
    onAction?: () => void;
    currentColourRef?: RefObject<string>;
}

const SidebarButton = ({
    icon,
    label,
    isActive,
    onSelect,
    onAction,
    currentColourRef,
}: SidebarButtonProps) => {
    const [hovered, setHovered] = useState(false);
    const [showColourSelect, setShowColourSelect] = useState(false);

    const handleClick = () => {
        if (currentColourRef?.current && isActive) {
            setShowColourSelect((prev) => !prev);
        }
        onSelect?.();
        onAction?.();
    };

    return (
        <button
            className="cursor-pointer w-12 h-12 rounded-full flex items-center justify-center border-white/5 transition-colors duration-150"
            style={{
                border: `2px solid ${isActive ? "#777777" : hovered ? "#444444" : "#191916"}`,
                backgroundColor: `${isActive ? "#1b1b1c" : "transparent"}`,
            }}
            onClick={() => handleClick()}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div className="relative w-6 h-6">
                <Image src={icon} alt={label} fill />
                <div
                    className={cn(
                        "absolute rounded-full w-4 h-4 bottom-1/2 translate-y-1/2 -right-12",
                        currentColourRef?.current && isActive
                            ? "block"
                            : "hidden",
                    )}
                    style={{
                        backgroundColor: `${currentColourRef?.current}`,
                    }}
                />
                {showColourSelect && currentColourRef?.current && (
                    <ColourSelector
                        visible={showColourSelect}
                        currentColourRef={currentColourRef}
                    />
                )}
            </div>
        </button>
    );
};

export default SidebarButton;
