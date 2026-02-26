import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ConditionalFooter } from "@/components/ConditionalFooter";

export const metadata: Metadata = {
  title: "Proper Place - Find Your Perfect Venue",
  description: "Book unique venues and host unforgettable gatherings",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">
        <Navbar />
        <div className="pt-24">
          {children}
        </div>
        <ConditionalFooter />
      </body>
    </html>
  );
}
