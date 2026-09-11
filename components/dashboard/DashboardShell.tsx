"use client";

import React, { useState } from "react";
import Navbar from "../home/Navbar";
import { cn } from "@/lib/utils";
import { CollapseState, writeSidebarCookie } from "@/lib/sidebarCookie";
import {
    TableDensity,
    writeTableDensityCookie,
} from "@/lib/tableDensityCookie";
import { byCollapseState, SidebarCollapseContext } from "./sidebarCollapse";
import { TableDensityContext } from "./tableDensity";

type DashboardShellProps = {
    sidebar: React.ReactNode;
    bottomBar: React.ReactNode;
    initialCollapsed?: CollapseState;
    initialDensity?: TableDensity;
    overlay?: React.ReactNode;
    children: React.ReactNode;
};

// Separate from DashboardClient so the chrome stays put while the column swaps
// between skeleton and loaded content.
const DashboardShell = ({
    sidebar,
    bottomBar,
    initialCollapsed = null,
    initialDensity = "default",
    overlay,
    children,
}: DashboardShellProps) => {
    const [collapsed, setCollapsed] = useState<CollapseState>(initialCollapsed);
    const [density, setDensityState] = useState<TableDensity>(initialDensity);

    const setDensity = (next: TableDensity) => {
        setDensityState(next);
        writeTableDensityCookie(next);
    };

    const toggle = () => {
        const next =
            collapsed === null
                ? window.matchMedia("(min-width: 64rem)").matches
                : !collapsed;
        setCollapsed(next);
        writeSidebarCookie(next);
    };

    return (
        <SidebarCollapseContext.Provider value={{ collapsed, toggle }}>
            <TableDensityContext.Provider value={{ density, setDensity }}>
                <div className="dashboard-root flex bg-card-background min-h-dvh">
                    <div className="hidden md:block">{sidebar}</div>
                    <div className="block md:hidden">
                        <Navbar />
                    </div>
                    <div
                        className={cn(
                            "w-full min-w-0 min-h-dvh flex flex-col bg-background",
                            "px-4 pt-[calc(2.5rem+4svh+2rem)] gap-6 pb-safe [--safe-pb:6rem]",
                            "md:m-2 md:min-h-[calc(100dvh-1rem)] md:rounded-xl",
                            "md:px-[2.5dvw] md:pt-[2.5dvw] md:gap-[2.5dvw] md:[--safe-pb:2.5dvw]",
                            "md:transition-[margin-left]",
                            byCollapseState(
                                collapsed,
                                "md:ml-17",
                                "md:ml-75",
                                "md:ml-17 lg:ml-75",
                            ),
                            overlay &&
                                "relative overflow-hidden max-h-dvh md:max-h-[calc(100dvh-1rem)]",
                        )}
                    >
                        {children}
                        {overlay}
                    </div>
                    <div className="md:hidden">{bottomBar}</div>
                </div>
            </TableDensityContext.Provider>
        </SidebarCollapseContext.Provider>
    );
};

export default DashboardShell;
