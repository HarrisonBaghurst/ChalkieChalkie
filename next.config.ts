import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "img.clerk.com",
            },
        ],
    },
    allowedDevOrigins: [process.env.ALLOWED_DEV_ORIGINS as string],
};

export default nextConfig;
