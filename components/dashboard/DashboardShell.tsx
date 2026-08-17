import React from "react";
import Navbar from "../home/Navbar";

type DashboardShellProps = {
    sidebar: React.ReactNode; // 2xl and up only
    bottomBar: React.ReactNode; // below 2xl only; carries the Sidebar's Actions
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
            <div className="hidden 2xl:block">{sidebar}</div>
            <div className="block 2xl:hidden">
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
                    "2xl:m-2 2xl:ml-75 2xl:min-h-[calc(100dvh-1rem)] 2xl:rounded-xl " +
                    "2xl:px-[2.5dvw] 2xl:pt-[2.5dvw] 2xl:gap-[2.5dvw] 2xl:[--safe-pb:2.5dvw]"
                }
            >
                {children}
            </div>
            <div className="2xl:hidden">{bottomBar}</div>
        </div>
    );
};

export default DashboardShell;
