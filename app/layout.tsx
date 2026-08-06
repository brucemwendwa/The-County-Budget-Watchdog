import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { LocationProvider } from "@/components/location-provider";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "County Budget Tracker",
    template: "%s · County Budget Tracker"
  },
  description:
    "Track. Understand. Participate. Explore Kenya's county budgets from county to ward level, ask questions grounded in official documents, and share ideas for your ward."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applied before first paint so a dark-mode user never sees a white flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem("cbt-theme")==="dark")document.documentElement.classList.add("dark");}catch(e){}})();`
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <LocationProvider>
            <AppShell>{children}</AppShell>
          </LocationProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
