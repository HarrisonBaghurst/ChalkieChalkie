"use client";

import { PlanEntitlements, PlanUsage } from "@/types/planTypes";
import { ReactNode, createContext, useContext } from "react";

export type EntitlementsState = {
    entitlements: PlanEntitlements | null;
    usage: PlanUsage | null;
};

const EMPTY: EntitlementsState = { entitlements: null, usage: null };

const EntitlementsContext = createContext<EntitlementsState>(EMPTY);

export const EntitlementsProvider = ({
    value,
    children,
}: {
    value: EntitlementsState;
    children: ReactNode;
}) => (
    <EntitlementsContext.Provider value={value}>
        {children}
    </EntitlementsContext.Provider>
);

export const useEntitlements = (): EntitlementsState =>
    useContext(EntitlementsContext);
