import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Chalkie Chalkie | Online whiteboard",
  description: "Collaborative online whiteboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`antialiased`}
        >
          <div className="relative">
            <Header />
            {children}
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
