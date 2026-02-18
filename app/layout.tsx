import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Header from "@/components/Header";

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
        <ClerkProvider>
            <html lang="en">
                <body className={`antialiased`}>
                    <div className="relative">
                        <Header />
                        {children}
                    </div>
                </body>
            </html>
        </ClerkProvider>
    );
}
