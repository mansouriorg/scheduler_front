import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppSidebar } from "@/components/app-sidebar";
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
  title: "Catchub Edu | Admin",
  description: "University Scheduling System Admin Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex h-screen flex-col overflow-hidden bg-gray-50 text-gray-900 md:flex-row`}
      >
        {/* Lets keyboard users jump over the menu straight to the page content. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-gray-900 focus:shadow-lg"
        >
          Skip to content
        </a>

        {/* Sidebar on tablets and computers; top bar with a menu button on phones. */}
        <AppSidebar />

        {/* The page content scrolls on its own, next to (or below) the menu. */}
        <main id="main" tabIndex={-1} className="relative flex-1 overflow-y-auto focus:outline-none">
          {children}
        </main>
      </body>
    </html>
  );
}
