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
    allowedDevOrigins: ["192.168.1.227", "10.192.208.153", "192.168.1.187"],
};

export default nextConfig;
