export const CONCERN_CATEGORIES = [
    { key: "behaviour", label: "Someone's behaviour" },
    { key: "content", label: "Something in the workspace" },
    { key: "other", label: "Something else" },
] as const;

export type ConcernCategory = (typeof CONCERN_CATEGORIES)[number]["key"];

export const MAX_CONCERN_DETAILS = 5000;

export const MAX_REPORTER_EMAIL = 254;

export const CEOP_URL = "https://www.ceop.police.uk";

export const concernCategoryLabel = (key: ConcernCategory): string =>
    CONCERN_CATEGORIES.find((category) => category.key === key)?.label ?? key;

export const isConcernCategory = (value: unknown): value is ConcernCategory =>
    CONCERN_CATEGORIES.some((category) => category.key === value);

export type ConcernReportBody = {
    category: ConcernCategory;
    details: string;
    workspaceId?: string;
    reportedUserId?: string;
    email?: string;
};
