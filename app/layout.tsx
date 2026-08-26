import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { clerkAppearance } from "@/lib/clerkAppearance";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DebugBreakpoint from "@/components/DebugBreakpoint";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
    title: "Chalkie Chalkie",
    description: "Where effort becomes understanding",
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
