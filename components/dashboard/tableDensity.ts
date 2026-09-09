"use client";

import { createContext, useContext } from "react";
import { TableDensity } from "@/lib/tableDensityCookie";

export type { TableDensity };

type TableDensityValue = {
    density: TableDensity;
    setDensity: (density: TableDensity) => void;
};

export const TableDensityContext = createContext<TableDensityValue>({
    density: "default",
    setDensity: () => {},
});

export const useTableDensity = () => useContext(TableDensityContext);

export const DENSITY_ROW_CLASS: Record<TableDensity, string> = {
    compact: "py-1.5",
    default: "py-3",
    comfortable: "py-5",
};

export const DENSITY_LABEL: Record<TableDensity, string> = {
    compact: "Compact",
    default: "Default",
    comfortable: "Comfortable",
};

export const TABLE_DENSITIES: TableDensity[] = [
    "compact",
    "default",
    "comfortable",
];
