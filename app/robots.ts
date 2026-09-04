import type { MetadataRoute } from "next";
import { absoluteUrl, siteUrl } from "@/lib/siteUrl";

const robots = (): MetadataRoute.Robots => ({
    rules: {
        userAgent: "*",
        allow: "/",
        disallow: [
            "/api/",
            "/board/",
            "/dashboard",
            "/sign-in",
            "/forbidden",
            "/style-guide",
        ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl,
});

export default robots;
