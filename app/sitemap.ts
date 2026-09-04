import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/siteUrl";
import cookiePolicy from "@/data/policies/cookie-policy.json";
import privacyPolicy from "@/data/policies/privacy-policy.json";
import termsOfService from "@/data/policies/terms-of-service.json";

const MONTHS = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
];

// Parsed as UTC rather than handed to `new Date(string)`: that reads
// "19 July 2026" as local midnight, so a BST build emits the 18th.
const parsePolicyDate = (value: string): Date | undefined => {
    const match = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(value.trim());
    if (!match) return undefined;

    const month = MONTHS.indexOf(match[2].toLowerCase());
    if (month === -1) return undefined;

    const date = new Date(
        Date.UTC(Number(match[3]), month, Number(match[1])),
    );
    return Number.isNaN(date.getTime()) ? undefined : date;
};

const policyPages = [
    { path: "/privacy-policy", lastUpdated: privacyPolicy.lastUpdated },
    { path: "/terms-of-service", lastUpdated: termsOfService.lastUpdated },
    { path: "/cookie-policy", lastUpdated: cookiePolicy.lastUpdated },
];

const sitemap = (): MetadataRoute.Sitemap => [
    {
        url: absoluteUrl("/"),
        changeFrequency: "monthly",
        priority: 1,
    },
    ...policyPages.map(({ path, lastUpdated }) => ({
        url: absoluteUrl(path),
        lastModified: parsePolicyDate(lastUpdated),
        changeFrequency: "yearly" as const,
        priority: 0.3,
    })),
];

export default sitemap;
