import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { clerkAppearance } from "@/lib/clerkAppearance";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
    title: "Chalkie Chalkie | Your Teaching & Learning tool",
    description: "Your Teaching & Learning tool",
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
