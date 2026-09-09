import { cookies } from "next/headers";
import {
    CollapseState,
    parseSidebarCookie,
    SIDEBAR_COOKIE,
} from "@/lib/sidebarCookie";

export const readSidebarCookie = async (): Promise<CollapseState> => {
    const store = await cookies();
    return parseSidebarCookie(store.get(SIDEBAR_COOKIE)?.value);
};
