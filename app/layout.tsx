import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { clerkAppearance } from "@/lib/clerkAppearance";
import { siteUrl } from "@/lib/siteUrl";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DebugBreakpoint from "@/components/DebugBreakpoint";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const DESCRIPTION =
    "A real-time collaborative whiteboard for tutors and their students.";

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: "Chalkie Chalkie",
        template: "%s | Chalkie Chalkie",
    },
    description: DESCRIPTION,
    applicationName: "Chalkie Chalkie",
    keywords: [
        "online whiteboard",
        "collaborative whiteboard",
        "tutoring",
        "online tutoring",
        "tutor",
        "virtual classroom",
    ],
    openGraph: {
        type: "website",
        siteName: "Chalkie Chalkie",
        title: "Chalkie Chalkie",
        description: DESCRIPTION,
        url: "/",
        locale: "en_GB",
    },
    twitter: {
        card: "summary_large_image",
        title: "Chalkie Chalkie",
        description: DESCRIPTION,
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
};

// Next's defaults, restated so viewportFit can ride along: without it
// env(safe-area-inset-*) reports zero and .pb-safe does nothing.
export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <ClerkProvider appearance={clerkAppearance}>
            <html lang="en" className={cn("font-sans", geist.variable)}>
                <body className={`antialiased w-full overflow-x-hidden`}>
                    <TooltipProvider>
                        <div className="relative">
                            {children}
                            <Toaster position="bottom-center" richColors />
                            <DebugBreakpoint />
                        </div>
                    </TooltipProvider>
                </body>
            </html>
        </ClerkProvider>
    );
}
