"use client";

import { ChangeEvent, RefObject, useRef } from "react";
import { useHistory } from "@/hooks/realtime/hooks";
import { Tools } from "@/types/toolTypes";
import { ACCEPTED_INPUT_TYPES } from "@/lib/imageLimits";
import ToolbarButton from "./ToolbarButton";

const ACCEPT_ATTRIBUTE = [...ACCEPTED_INPUT_TYPES].join(",");

type ToolbarProps = {
    currentTool: Tools;
    currentColourRef: RefObject<string>;
    highlightColourRef: RefObject<string>;
    onToolChanged: (tool: Tools) => void;
    onInsertFile: (file: File) => void;
};

const Toolbar = ({
    currentTool,
    currentColourRef,
    highlightColourRef,
    onToolChanged,
    onInsertFile,
}: ToolbarProps) => {
    const { undo, redo } = useHistory();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleToolChange = (tool: Tools) => {
        onToolChanged(tool);
    };

    const openFilePicker = () => {
        const input = fileInputRef.current;
        if (!input) return;
        // Cleared here rather than after choosing, so re-picking the same file
        // still fires change: the upload reads the File several awaits later,
        // and clearing the input out from under it loses the disk read.
        input.value = "";
        input.click();
    };

    const handleFileChosen = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // A focused input makes useKeybinds bail on every shortcut.
        e.target.blur();
        if (file) onInsertFile(file);
    };

    return (
        <>
            <div className="fixed left-4 top-1/2 -translate-y-1/2 select-none bg-card-background radius-surface border border-foreground-third/15 flex flex-col gap-2">
                <div className="flex flex-col gap-2 p-2">
                    <ToolbarButton
                        icon={"/icons/mouse-pointer-2.svg"}
                        label="pointer icon"
                        isActive={currentTool === "pointer"}
                        onSelect={() => handleToolChange("pointer")}
                    />
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
                </div>
                <div className="w-full h-px bg-foreground-third/15" />
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
                <div className="w-full h-px bg-foreground-third/15" />
                <div className="flex flex-col gap-2 p-2">
                    <ToolbarButton
                        icon="/icons/image-plus.svg"
                        label="add image or PDF"
                        onAction={openFilePicker}
                    />
                </div>
            </div>

            {/* The only way onto the canvas without a keyboard: iPadOS offers
                Photo Library, Take Photo and Files from this one input. */}
            <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_ATTRIBUTE}
                className="hidden"
                onChange={handleFileChosen}
            />
        </>
    );
};

export default Toolbar;
