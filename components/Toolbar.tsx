"use client";

import { RefObject } from "react";
import { useHistory } from "@liveblocks/react";
import { Tools } from "@/types/toolTypes";
import ToolbarButton from "./ToolbarButton";

type ToolbarProps = {
    currentTool: Tools;
    currentColourRef: RefObject<string>;
    highlightColourRef: RefObject<string>;
    onToolChanged: (tool: Tools) => void;
};

const Toolbar = ({
    currentTool,
    currentColourRef,
    highlightColourRef,
    onToolChanged,
}: ToolbarProps) => {
    const { undo, redo } = useHistory();

    const handleToolChange = (tool: Tools) => {
        onToolChanged(tool);
    };

    return (
        <>
            <div className="fixed left-4 top-1/2 -translate-y-1/2 bg-card-background rounded-lg flex flex-col gap-2">
                <div className="flex flex-col gap-2 p-2">
                    <ToolbarButton
                        icon={"/icons/pen-tool.svg"}
                        label="pen icon"
                        isActive={currentTool === "pen"}
                        onSelect={() => handleToolChange("pen")}
                        currentColourRef={currentColourRef}
                    />
                    <ToolbarButton
                        icon={"/icons/highlighter.svg"}
                        label="highlighter icon"
                        isActive={currentTool === "highlighter"}
                        onSelect={() => handleToolChange("highlighter")}
                        highlightColourRef={highlightColourRef}
                    />
                    <ToolbarButton
                        icon={"/icons/eraser.svg"}
                        label="eraser icon"
                        isActive={currentTool === "eraser"}
                        onSelect={() => handleToolChange("eraser")}
                    />
                    <ToolbarButton
                        icon={"/icons/mouse-pointer-2.svg"}
                        label="pointer icon"
                        isActive={currentTool === "pointer"}
                        onSelect={() => handleToolChange("pointer")}
                    />
                    <ToolbarButton
                        icon={"/icons/square-dashed.svg"}
                        label="selector icon"
                        isActive={currentTool === "selector"}
                        onSelect={() => handleToolChange("selector")}
                    />
                </div>
                <div className="w-full h-px bg-foreground-third" />
                <div className="flex flex-col gap-2 p-2">
                    <ToolbarButton
                        icon="/icons/undo.svg"
                        label="undo"
                        onAction={undo}
                    />
                    <ToolbarButton
                        icon="/icons/redo.svg"
                        label="redo"
                        onAction={redo}
                    />
                </div>
            </div>
        </>
    );
};

export default Toolbar;
