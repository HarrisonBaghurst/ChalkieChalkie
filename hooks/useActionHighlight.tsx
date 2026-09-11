"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    ACTION_HIGHLIGHT_PARAM,
    DashboardActionId,
    parseActionHighlight,
} from "@/lib/dashboardActions";

const HIGHLIGHT_MS = 5000;

export const useActionHighlight = (id?: DashboardActionId | null): boolean => {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();

    const requested = parseActionHighlight(params.get(ACTION_HIGHLIGHT_PARAM));
    const active = !!id && requested === id;

    useEffect(() => {
        if (!active) return;

        const timer = setTimeout(() => router.replace(pathname), HIGHLIGHT_MS);

        return () => clearTimeout(timer);
    }, [active, pathname, router]);

    return active;
};
