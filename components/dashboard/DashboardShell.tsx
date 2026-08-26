import React from "react";
import Navbar from "../home/Navbar";

type DashboardShellProps = {
    sidebar: React.ReactNode; // lg and up only
    bottomBar: React.ReactNode; // below lg only; carries the Sidebar's Actions
    children: React.ReactNode;
};

// Separate from DashboardClient so the chrome stays put while the column swaps
// between skeleton and loaded content.
const DashboardShell = ({
    sidebar,
    bottomBar,
    children,
}: DashboardShellProps) => {
    return (
        <div className="dashboard-root flex bg-card-background min-h-dvh">
            <div className="hidden lg:block">{sidebar}</div>
            <div className="block lg:hidden">
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
                    "lg:m-2 lg:ml-75 lg:min-h-[calc(100dvh-1rem)] lg:rounded-xl " +
                    "lg:px-[2.5dvw] lg:pt-[2.5dvw] lg:gap-[2.5dvw] lg:[--safe-pb:2.5dvw]"
                }
            >
                {children}
            </div>
            <div className="lg:hidden">{bottomBar}</div>
        </div>
    );
};

export default DashboardShell;
