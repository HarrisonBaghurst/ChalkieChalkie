import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { clerkAppearance } from "@/lib/clerkAppearance";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
    title: "Chalkie Chalkie",
    description: "Where effort becomes understanding",
};

// Next's defaults, restated because `viewportFit` has to ride along with them:
// it opts the page into the display cutout area, which is what makes
// env(safe-area-inset-*) report real values. The `.pb-safe` utility in
// globals.css reads those to keep the dashboard's bottom bar clear of the iOS
// home indicator.
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
                        </div>
                    </TooltipProvider>
                </body>
            </html>
        </ClerkProvider>
    );
}
