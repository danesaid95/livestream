import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "LiveStream - Watch & Stream Live",
  description: "A creator-focused live-streaming platform. Watch live streams, send gifts, and connect with your favorite creators.",
  keywords: ["livestream", "streaming", "creators", "live", "video"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-gray-950 text-gray-100`}>
        {children}
      </body>
    </html>
  );
}
