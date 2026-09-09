"use client";

import React, { useState } from "react";
import Navbar from "../home/Navbar";
import { CollapseState, writeSidebarCookie } from "@/lib/sidebarCookie";
import { byCollapseState, SidebarCollapseContext } from "./sidebarCollapse";

type DashboardShellProps = {
    sidebar: React.ReactNode;
    bottomBar: React.ReactNode;
    initialCollapsed?: CollapseState;
    children: React.ReactNode;
};

// Separate from DashboardClient so the chrome stays put while the column swaps
// between skeleton and loaded content.
const DashboardShell = ({
    sidebar,
    bottomBar,
    initialCollapsed = null,
    children,
}: DashboardShellProps) => {
    const [collapsed, setCollapsed] = useState<CollapseState>(initialCollapsed);

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
            <div className="dashboard-root flex bg-card-background min-h-dvh">
                <div className="hidden md:block">{sidebar}</div>
                <div className="block md:hidden">
                    <Navbar />
                </div>
                <div
                    className={
                        // Per-edge padding, not `p-*`: a shorthand next to
                        // .pb-safe would leave the winner up to stylesheet order.
                        // pt clears the fixed Navbar, pb the tab bar.
                        // rounded-xl, not radius-surface: the tier classes are
                        // plain CSS, so Tailwind can't build a breakpoint variant.
                        "w-full min-h-dvh flex flex-col bg-background " +
                        "px-4 pt-[calc(2.5rem+4svh+2rem)] gap-6 pb-safe [--safe-pb:6rem] " +
                        "md:m-2 md:min-h-[calc(100dvh-1rem)] md:rounded-xl " +
                        "md:px-[2.5dvw] md:pt-[2.5dvw] md:gap-[2.5dvw] md:[--safe-pb:2.5dvw] " +
                        "md:transition-[margin-left] " +
                        byCollapseState(
                            collapsed,
                            "md:ml-17",
                            "md:ml-75",
                            "md:ml-17 lg:ml-75",
                        )
                    }
                >
                    {children}
                </div>
                <div className="md:hidden">{bottomBar}</div>
            </div>
        </SidebarCollapseContext.Provider>
    );
};

export default DashboardShell;
