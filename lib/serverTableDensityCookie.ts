import { cookies } from "next/headers";
import {
    parseTableDensityCookie,
    TABLE_DENSITY_COOKIE,
    TableDensity,
} from "@/lib/tableDensityCookie";

export const readTableDensityCookie = async (): Promise<TableDensity> => {
    const store = await cookies();
    return parseTableDensityCookie(store.get(TABLE_DENSITY_COOKIE)?.value);
};
