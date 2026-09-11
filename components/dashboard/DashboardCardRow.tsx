"use client";

import React from "react";
import { useSidebarCollapse } from "./sidebarCollapse";
import { dashboardCardRow } from "./Next";

const DashboardCardRow = ({ children }: { children: React.ReactNode }) => {
    const { collapsed } = useSidebarCollapse();
    return <div className={dashboardCardRow(collapsed)}>{children}</div>;
};

export default DashboardCardRow;
