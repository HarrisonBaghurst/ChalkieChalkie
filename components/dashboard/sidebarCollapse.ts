"use client";

import { createContext, useContext } from "react";
import { CollapseState } from "@/lib/sidebarCookie";

export type { CollapseState };

type SidebarCollapseValue = {
    collapsed: CollapseState;
    toggle: () => void;
};

export const SidebarCollapseContext = createContext<SidebarCollapseValue>({
    collapsed: null,
    toggle: () => {},
});

export const useSidebarCollapse = () => useContext(SidebarCollapseContext);

export const byCollapseState = (
    collapsed: CollapseState,
    rail: string,
    panel: string,
    auto: string,
) => (collapsed === null ? auto : collapsed ? rail : panel);
