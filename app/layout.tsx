import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body
        className={`antialiased`}
      >
        <div className="">
          {children}
        </div>
      </body>
    </html>
  );
}
