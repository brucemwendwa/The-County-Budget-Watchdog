import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "County Budget Watchdog",
  description: "Plain-language county budget intelligence for Kenyan residents."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <header className="sticky top-0 z-40 border-b bg-background/88 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2 font-bold tracking-normal">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span>County Budget Watchdog</span>
            </Link>
            <nav className="hidden items-center gap-1 text-sm font-semibold md:flex">
              <Link className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground" href="/">
                Home
              </Link>
              <Link
                className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                href="/dashboard"
              >
                Dashboard
              </Link>
              <Link
                className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                href="/chat"
              >
                Chat
              </Link>
              <Link
                className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                href="/alerts"
              >
                Alerts
              </Link>
              <Link
                className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                href="/admin"
              >
                Admin
              </Link>
            </nav>
            <nav className="flex items-center gap-1 text-xs font-semibold md:hidden">
              <Link className="rounded-md px-2 py-2 text-muted-foreground hover:bg-muted hover:text-foreground" href="/dashboard">
                Dashboard
              </Link>
              <Link className="rounded-md px-2 py-2 text-muted-foreground hover:bg-muted hover:text-foreground" href="/chat">
                Chat
              </Link>
              <Link className="rounded-md px-2 py-2 text-muted-foreground hover:bg-muted hover:text-foreground" href="/alerts">
                Alerts
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
