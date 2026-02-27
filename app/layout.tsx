import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link"; // <-- 1. Import Next.js Link
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex h-screen bg-gray-50 text-gray-900 overflow-hidden`}
      >
        
        {/* SIDEBAR NAVIGATION */}
        <nav className="w-64 bg-gray-900 text-white flex flex-col shadow-xl z-10 flex-shrink-0">
          <div className="p-6 border-b border-gray-800">
            <h1 className="text-xl font-bold tracking-wider text-blue-400">
              CATCHUB<span className="text-white">.EDU</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">Admin Dashboard</p>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              <li className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-4 px-3">Static Data</li>
              <li><SidebarLink href="/locations" icon="🏢" label="Locations" /></li>
              <li><SidebarLink href="/classrooms" icon="🚪" label="Classrooms" /></li>
              <li><SidebarLink href="/teachers" icon="👨‍🏫" label="Teachers" /></li>
              
              <li className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-8 px-3">Academics</li>
              <li><SidebarLink href="/terms" icon="📅" label="Academic Terms" /></li>
              <li><SidebarLink href="/cohorts" icon="👥" label="Student Cohorts" /></li>
              <li><SidebarLink href="/courses" icon="📘" label="Course Catalog" /></li>
              
              <li className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-8 px-3">Execution</li>
              <li><SidebarLink href="/offerings" icon="⚙️" label="Course Offerings" /></li>
            </ul>
          </div>
        </nav>

        {/* MAIN CONTENT AREA */}
        {/* This takes up the rest of the screen and scrolls independently */}
        <main className="flex-1 overflow-y-auto relative">
          {children}
        </main>

      </body>
    </html>
  );
}

// Small helper component to keep the sidebar code clean
function SidebarLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link 
      href={href}
      className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
    >
      <span className="text-lg">{icon}</span>
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}