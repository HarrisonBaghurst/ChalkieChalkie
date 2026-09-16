import type { NextConfig } from "next";
import changelog from "./data/changelog.json";

const nextConfig: NextConfig = {
    env: {
        NEXT_PUBLIC_VERSION: changelog.currentVersion,
    },
    allowedDevOrigins: [process.env.ALLOWED_DEV_ORIGINS as string],
};

export default nextConfig;
