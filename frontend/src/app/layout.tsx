import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { headingFont, bodyFont } from "@/src/fonts";
import Navbar from "@/src/components/layout/Navbar";
import Footer from "@/src/components/layout/Footer";
import { CartProvider } from "@/src/context/CartProvider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "STUDIO MONTRO",
  description:
    "Design-led furniture, lighting and interior objects for everyday spaces.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${headingFont.variable} ${bodyFont.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <CartProvider>
          <Navbar />

          <div className="flex-1">{children}</div>

          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
