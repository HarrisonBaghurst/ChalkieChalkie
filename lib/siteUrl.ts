const FALLBACK_SITE_URL = "http://localhost:3000";

export const siteUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? FALLBACK_SITE_URL
).replace(/\/+$/, "");

export const absoluteUrl = (path: string) =>
    `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
