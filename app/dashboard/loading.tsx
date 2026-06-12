import React from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardSkeleton from "@/components/dashboard/skeletons/DashboardSkeleton";

// Shown during the server render gap (the dashboard page awaits Clerk's
// getUserList) before DashboardClient mounts. Mirrors DashboardClient's shell.
const DashboardLoading = () => {
    return (
        <div className="flex">
            <Sidebar />
            <div className="ml-75 w-full h-full p-16 flex flex-col gap-6">
                <DashboardSkeleton />
            </div>
        </div>
    );
};

export default DashboardLoading;
