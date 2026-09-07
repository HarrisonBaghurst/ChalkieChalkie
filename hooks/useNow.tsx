"use client";

import { useEffect, useState } from "react";

export const useNow = (intervalMs: number = 60_000): number => {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);

    return now;
};

export default useNow;
