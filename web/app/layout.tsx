import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ConditionalFooter } from "@/components/ConditionalFooter";
import ScrollToTop from "@/components/ScrollToTop";

export const metadata: Metadata = {
  title: "Proper Place - Find Your Proper Place to Stay",
  description: "Connecting the UK's motorhome community with unique, affordable Proper Places to stay the night.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">
        <ScrollToTop />
        <Navbar />
        <div className="pt-24">
          {children}
        </div>
        <ConditionalFooter />
      </body>
    </html>
  );
}
