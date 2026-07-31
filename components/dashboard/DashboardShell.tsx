import React from "react";
import Navbar from "../home/Navbar";

type DashboardShellProps = {
    // Rendered only at 2xl and above; the Navbar takes over below that.
    sidebar: React.ReactNode;
    children: React.ReactNode;
};

// Dashboard page chrome: the responsive sidebar/navbar swap plus the inset
// rounded content column. Kept separate from DashboardClient so the shell stays
// put while the column swaps between DashboardSkeleton and the loaded content.
const DashboardShell = ({ sidebar, children }: DashboardShellProps) => {
    return (
        <div className="dashboard-root flex bg-card-background min-h-dvh">
            <div className="hidden 2xl:block">{sidebar}</div>
            <div className="block 2xl:hidden">
                <Navbar />
            </div>
            <div className="2xl:ml-75 w-full min-h-[calc(100dvh-1rem)] p-[2.5dvw] flex flex-col gap-[2.5dvw] bg-background m-2 radius-surface">
                {children}
            </div>
        </div>
    );
};

export default DashboardShell;
