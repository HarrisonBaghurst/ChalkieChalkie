import React from "react";
import Navbar from "../home/Navbar";

type DashboardShellProps = {
    // Rendered only at 2xl and above; the Navbar takes over below that.
    sidebar: React.ReactNode;
    // The mobile counterpart: bottom tab bar plus its floating action button,
    // rendered only below 2xl. Carries the Actions the Sidebar holds on
    // desktop, so they stay reachable when the Sidebar is hidden.
    bottomBar: React.ReactNode;
    children: React.ReactNode;
};

// Dashboard page chrome: the responsive sidebar/navbar swap plus the content
// column. Kept separate from DashboardClient so the shell stays put while the
// column swaps between DashboardSkeleton and the loaded content.
//
// Mobile-first. Below 2xl the column runs edge-to-edge, clearing the fixed
// Navbar above and the fixed tab bar below; at 2xl it becomes the inset
// rounded panel floating on the card surface.
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
                    // Padding is set as separate edges rather than `p-*`
                    // shorthand: the bottom edge is `.pb-safe`, and a shorthand
                    // alongside it would leave the winner up to stylesheet
                    // order. Its base value moves per breakpoint through
                    // `--safe-pb` for the same reason.
                    //
                    // pt clears the fixed Navbar — its 40px avatar row plus
                    // `py-[2svh]` top and bottom — then adds 2rem, so the page
                    // heading stands off the navbar instead of butting against
                    // it. pb clears the tab bar with room to spare, so the last
                    // row never hides under it.
                    //
                    // 2xl:rounded-xl, not radius-surface: the tier classes live
                    // in @layer components as plain CSS, so Tailwind can't
                    // generate a breakpoint variant for them. --radius-xl is
                    // the same 14px the tier resolves to.
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
