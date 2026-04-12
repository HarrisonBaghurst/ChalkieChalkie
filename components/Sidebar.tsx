"use client";

import { RefObject, useEffect, useState } from "react";
import { useHistory } from "@liveblocks/react";
import { Tools } from "@/types/toolTypes";
import SidebarButton from "./SidebarButton";

type SidebarProps = {
    currentTool: Tools;
    currentColourRef: RefObject<string>;
    onToolChanged: (tool: Tools) => void;
};

const Sidebar = ({
    currentTool,
    currentColourRef,
    onToolChanged,
}: SidebarProps) => {
    const { undo, redo } = useHistory();

    const handleToolChange = (tool: Tools) => {
        onToolChanged(tool);
    };

    return (
        <>
            <div className="fixed left-4 top-1/2 -translate-y-1/2 bg-[#0d0d0a] rounded-full border border-[color-mix(in_oklab,var(--color-white)_5%,transparent)] flex flex-col gap-2">
                <div className="flex flex-col gap-2 p-2">
                    <SidebarButton
                        icon={"/icons/pen.svg"}
                        label="pen icon"
                        isActive={currentTool === "pen"}
                        onSelect={() => handleToolChange("pen")}
                        currentColourRef={currentColourRef}
                    />
                    <SidebarButton
                        icon={"/icons/eraser.svg"}
                        label="eraser icon"
                        isActive={currentTool === "eraser"}
                        onSelect={() => handleToolChange("eraser")}
                    />
                    <SidebarButton
                        icon={"/icons/pointer.svg"}
                        label="eraser icon"
                        isActive={currentTool === "pointer"}
                        onSelect={() => handleToolChange("pointer")}
                    />
                </div>
                <div className="w-full h-px bg-white/5" />
                <div className="flex flex-col gap-2 p-2">
                    <SidebarButton
                        icon="/icons/undo.svg"
                        label="undo"
                        onAction={undo}
                    />
                    <SidebarButton
                        icon="/icons/redo.svg"
                        label="redo"
                        onAction={redo}
                    />
                </div>
            </div>
        </>
    );
};

export default Sidebar;
